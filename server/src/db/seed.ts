import { dedupEvents, normalizeTitle } from "../domain/dedup";
import { db } from "./knex";
import { TestJsonSource } from "../sources/TestJsonSource";
import { ProCultureSource } from "../sources/ProCultureSource";
import { KudaGoSource } from "../sources/KudaGoSource";
import { config } from "../config";
import type { RawEvent } from "../sources/EventSource";

async function upsertVenue(raw: RawEvent["venue"]): Promise<string> {
  const existing = await db("venues").where({ name: raw.name, address: raw.address }).first();
  if (existing) return existing.id;
  const [row] = await db("venues")
    .insert({ name: raw.name, address: raw.address, lat: raw.lat, lon: raw.lon })
    .returning("id");
  return row.id;
}

async function main() {
  const source =
    config.eventSource === "proculture"
      ? new ProCultureSource()
      : config.eventSource === "kudago"
        ? new KudaGoSource()
        : new TestJsonSource();
  const raw = await source.fetchEvents();
  console.log(`Fetched ${raw.length} raw events from ${config.eventSource}`);

  const deduped = dedupEvents(
    raw.map((e) => ({ ...e, venue: e.venue, startsAt: e.startsAt }))
  );
  console.log(`After dedup: ${deduped.length} events (removed ${raw.length - deduped.length})`);

  await db("invite_responses").del();
  await db("invites").del();
  await db("events").del();
  await db("venues").del();

  for (const event of deduped) {
    const venueId = await upsertVenue(event.venue);
    await db("events")
      .insert({
        external_id: event.externalId,
        source: event.source,
        title: event.title,
        normalized_title: normalizeTitle(event.title),
        venue_id: venueId,
        category: event.category,
        min_age: event.minAge,
        price: event.price,
        starts_at: event.startsAt,
        purchase_url: event.purchaseUrl,
      })
      .onConflict(["source", "external_id"])
      .ignore();
  }

  console.log("Seed complete.");
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
