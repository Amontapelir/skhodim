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

async function fetchWithFallback(): Promise<{ raw: RawEvent[]; sourceName: string }> {
  const source =
    config.eventSource === "proculture"
      ? new ProCultureSource()
      : config.eventSource === "kudago"
        ? new KudaGoSource()
        : new TestJsonSource();

  if (config.eventSource === "test") {
    return { raw: await source.fetchEvents(), sourceName: "test" };
  }

  // A live source (KudaGo, PRO.Культура) can be briefly unreachable, and seed
  // runs on every server boot (including Render free-tier wake-from-sleep) —
  // if it throws, the whole startCommand chain fails and the server never
  // starts. Fall back to the bundled test data instead of crashing the boot.
  try {
    return { raw: await source.fetchEvents(), sourceName: config.eventSource };
  } catch (err) {
    console.error(`${config.eventSource} fetchEvents failed, falling back to test data:`, err);
    return { raw: await new TestJsonSource().fetchEvents(), sourceName: "test (fallback)" };
  }
}

async function main() {
  const { raw, sourceName } = await fetchWithFallback();
  console.log(`Fetched ${raw.length} raw events from ${sourceName}`);

  const deduped = dedupEvents(
    raw.map((e) => ({ ...e, venue: e.venue, startsAt: e.startsAt }))
  );
  console.log(`After dedup: ${deduped.length} events (removed ${raw.length - deduped.length})`);

  // Upserts by (source, external_id): existing events get their mutable
  // fields (price, description, etc.) refreshed in place, nothing is
  // deleted, so this is safe to run on every boot without touching venues
  // or any invites already created against these events.
  for (const event of deduped) {
    const venueId = await upsertVenue(event.venue);
    await db("events")
      .insert({
        external_id: event.externalId,
        source: event.source,
        title: event.title,
        normalized_title: normalizeTitle(event.title),
        description: event.description,
        venue_id: venueId,
        category: event.category,
        min_age: event.minAge,
        price: event.price,
        starts_at: event.startsAt,
        purchase_url: event.purchaseUrl,
      })
      .onConflict(["source", "external_id"])
      .merge(["title", "normalized_title", "description", "venue_id", "category", "min_age", "price", "starts_at", "purchase_url"]);
  }

  console.log("Seed complete.");
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
