import type { EventSource, RawEvent } from "./EventSource";

/**
 * KudaGo (kudago.com/public-api) — free official events API, no partner
 * agreement required. Fallback for when PRO.Культура.РФ access isn't
 * available yet.
 */
const KUDAGO_BASE_URL = "https://kudago.com/public-api/v1.4/events/";
// KudaGo only covers a fixed set of major cities (not literally all of
// Russia) — these are the two the product currently targets.
const LOCATION_SLUGS: Array<{ slug: string; label: string }> = [
  { slug: "msk", label: "Москва" },
  { slug: "kzn", label: "Казань" },
];

interface KudaGoPlace {
  title: string;
  address: string;
  coords?: { lat: number; lon: number };
}

interface KudaGoEvent {
  id: number;
  title: string;
  description: unknown;
  place?: KudaGoPlace;
  price: unknown;
  age_restriction: unknown;
  dates: Array<{ start: number; end: number }>;
  categories: string[];
  site_url: string;
}

function stripHtml(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, "").trim();
  return text.length > 0 ? text : null;
}

function mapCategory(categories: string[]): string {
  if (categories.includes("cinema")) return "cinema";
  if (categories.includes("theater")) return "theatre";
  if (categories.includes("concert")) return "concert";
  if (categories.includes("exhibition")) return "exhibition";
  if (categories.includes("museum")) return "museum";
  return "other";
}

function parsePrice(price: unknown): number {
  if (typeof price !== "string") return 0;
  // KudaGo sometimes gives a range ("250-500 ₽") — stripping all non-digits
  // from that would concatenate into "250500". Take the first number only,
  // as a representative starting price.
  const match = price.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseAgeRestriction(ageRestriction: unknown): number {
  if (typeof ageRestriction !== "string") return 0;
  const n = Number(ageRestriction.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function fetchCity(slug: string): Promise<RawEvent[]> {
  const url = new URL(KUDAGO_BASE_URL);
  url.searchParams.set("location", slug);
  url.searchParams.set("fields", "id,title,description,place,price,age_restriction,dates,categories,site_url");
  url.searchParams.set("expand", "place");
  url.searchParams.set("page_size", "100");
  url.searchParams.set("actual_since", String(Math.floor(Date.now() / 1000)));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`KudaGo API вернул ${response.status} для ${url.toString()}`);
  }

  const body = (await response.json()) as { results: KudaGoEvent[] };
  const raw: RawEvent[] = [];

  const now = Date.now();
  for (const ev of body.results) {
    if (!ev.place?.coords || !ev.dates?.[0]) continue;
    // KudaGo has "no fixed date" listings (recurring tours etc.) where
    // dates[0].start is present but bogus (e.g. resolves to year 1) rather
    // than absent — skip anything that doesn't land in a plausible window,
    // instead of inserting a bad date that would always fail the "not in
    // the past" filter anyway but could confuse dedup's time-window match.
    const startMs = ev.dates[0].start * 1000;
    if (!Number.isFinite(startMs) || startMs < now - 24 * 60 * 60 * 1000) continue;

    raw.push({
      externalId: String(ev.id),
      source: "kudago" as RawEvent["source"],
      title: ev.title,
      description: typeof ev.description === "string" ? stripHtml(ev.description) : null,
      venue: {
        name: ev.place.title,
        address: ev.place.address,
        lat: ev.place.coords.lat,
        lon: ev.place.coords.lon,
      },
      category: mapCategory(ev.categories),
      minAge: parseAgeRestriction(ev.age_restriction),
      price: parsePrice(ev.price),
      startsAt: new Date(startMs).toISOString(),
      purchaseUrl: ev.site_url,
    });
  }

  return raw;
}

export class KudaGoSource implements EventSource {
  async fetchEvents(): Promise<RawEvent[]> {
    const results = await Promise.allSettled(LOCATION_SLUGS.map((city) => fetchCity(city.slug)));

    const raw: RawEvent[] = [];
    const failed: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        raw.push(...result.value);
      } else {
        failed.push(LOCATION_SLUGS[i].label);
        console.error(`KudaGo: не удалось получить события для ${LOCATION_SLUGS[i].label}:`, result.reason);
      }
    });

    // Only fail the whole source if every city failed — one city being down
    // shouldn't throw away events we did manage to fetch for the others.
    if (raw.length === 0 && failed.length === LOCATION_SLUGS.length) {
      throw new Error(`KudaGo недоступен для всех городов: ${failed.join(", ")}`);
    }

    return raw;
  }
}
