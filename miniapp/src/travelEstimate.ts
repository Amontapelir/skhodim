// Rough, offline estimate of travel time and round-trip feasibility.
// Deliberately not calling Yandex's real routing API: that product isn't
// provisioned for this key (route() rejects with a bare "scriptError"), and
// even if it were, its 100-requests/day free quota can't cover evaluating
// every event on every filter change. Used both by the "Успею и вернусь"
// filter and by the per-card "Время в пути" button.

// Average city travel speed accounting for traffic/transfers, km/h.
const ASSUMED_SPEED_KMH = 22;

// How long a typical event of each category keeps you there, in minutes.
const EVENT_DURATION_MINUTES: Record<string, number> = {
  cinema: 130,
  theatre: 180,
  concert: 150,
  museum: 90,
  exhibition: 90,
  other: 120,
};

export function eventDurationMinutes(category: string): number {
  return EVENT_DURATION_MINUTES[category] ?? EVENT_DURATION_MINUTES.other;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in km between two [lat, lon] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** One-way estimated travel time in minutes, straight-line distance / assumed speed. */
export function estimateTravelMinutes(from: [number, number], to: [number, number]): number {
  return (distanceKm(from, to) / ASSUMED_SPEED_KMH) * 60;
}

/** "~24 мин" / "~1 ч 5 мин" — shared by the TravelTimeButton and the map balloon. */
export function formatTravelMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `~${rounded} мин`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `~${h} ч` : `~${h} ч ${m} мин`;
}

export interface ReturnByCheck {
  home: [number, number];
  /** "HH:MM" — the same calendar day as the event's own start date. */
  returnByTime: string;
}

/**
 * Rough check: can you get to the event and back home by returnByTime on the
 * same day, given an approximate one-way travel time and a typical event
 * duration for its category? Approximate — a heuristic, not a real route.
 */
export function fitsReturnBy(
  event: { startsAt: string; category: string; venue: { lat: number; lon: number } | null },
  check: ReturnByCheck
): boolean {
  if (!event.venue) return true; // can't estimate without coordinates — don't filter it out
  const travelMinutes = estimateTravelMinutes(check.home, [event.venue.lat, event.venue.lon]);
  const start = new Date(event.startsAt);
  const arriveHomeAt = new Date(start.getTime() + (eventDurationMinutes(event.category) + travelMinutes) * 60000);

  const [h, m] = check.returnByTime.split(":").map(Number);
  const returnDeadline = new Date(start);
  returnDeadline.setHours(h, m, 0, 0);

  return arriveHomeAt.getTime() <= returnDeadline.getTime();
}
