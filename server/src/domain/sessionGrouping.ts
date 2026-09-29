import type { Event } from "./types";

export interface EventSession {
  id: string;
  startsAt: string;
  price: number;
}

/**
 * The same real-world event (same title, same venue) often appears as
 * several separate rows — one per showtime/session, each with its own price
 * and startsAt (e.g. a film screened at 13:00, 16:00 and 19:30). Grouped by
 * (normalizedTitle, venueId): the earliest session is kept as the
 * representative card, and `sessions` lists every session (including itself)
 * sorted by time, so the UI can offer a time/price picker instead of
 * duplicate cards. Events with a single session are returned unchanged
 * (no `sessions` field), keeping the common case's shape as before.
 */
export function groupBySession<T extends Event>(events: T[]): Array<T & { sessions?: EventSession[] }> {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const key = `${event.normalizedTitle}|${event.venueId}`;
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  const result: Array<T & { sessions?: EventSession[] }> = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    const sorted = [...group].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    result.push({
      ...sorted[0],
      sessions: sorted.map((s) => ({ id: s.id, startsAt: s.startsAt, price: s.price })),
    });
  }
  return result;
}
