import type { EventSource, RawEvent } from "./EventSource";

/**
 * KudaGo (kudago.com/public-api) — free official events API, no partner
 * agreement required. Fallback for when PRO.Культура.РФ access isn't
 * available yet.
 */
const KUDAGO_BASE_URL = "https://kudago.com/public-api/v1.4/events/";
const MOSCOW_LOCATION_SLUG = "msk";

interface KudaGoPlace {
  title: string;
  address: string;
  coords?: { lat: number; lon: number };
}

interface KudaGoEvent {
  id: number;
  title: string;
  description: string;
  place?: KudaGoPlace;
  price: string;
  age_restriction: string;
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

function parsePrice(price: string): number {
  const digits = price.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function parseAgeRestriction(ageRestriction: string): number {
  const n = Number(ageRestriction.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export class KudaGoSource implements EventSource {
  async fetchEvents(): Promise<RawEvent[]> {
    const url = new URL(KUDAGO_BASE_URL);
    url.searchParams.set("location", MOSCOW_LOCATION_SLUG);
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

    for (const ev of body.results) {
      if (!ev.place?.coords || !ev.dates?.[0]) continue;
      raw.push({
        externalId: String(ev.id),
        source: "kudago" as RawEvent["source"],
        title: ev.title,
        description: ev.description ? stripHtml(ev.description) : null,
        venue: {
          name: ev.place.title,
          address: ev.place.address,
          lat: ev.place.coords.lat,
          lon: ev.place.coords.lon,
        },
        category: mapCategory(ev.categories),
        minAge: parseAgeRestriction(ev.age_restriction),
        price: parsePrice(ev.price),
        startsAt: new Date(ev.dates[0].start * 1000).toISOString(),
        purchaseUrl: ev.site_url,
      });
    }

    return raw;
  }
}
