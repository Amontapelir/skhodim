export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[«»"'!?.,:;()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Haversine distance in meters.
export function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[] = new Array(rows * cols);
  for (let i = 0; i < rows; i++) dist[i * cols] = i;
  for (let j = 0; j < cols; j++) dist[j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i * cols + j] = Math.min(
        dist[(i - 1) * cols + j] + 1,
        dist[i * cols + j - 1] + 1,
        dist[(i - 1) * cols + j - 1] + cost
      );
    }
  }
  return dist[rows * cols - 1];
}

/** Similarity ratio in [0, 1], 1 meaning identical strings (rapidfuzz-style ratio). */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export interface DedupCandidate {
  title: string;
  venue: { lat: number; lon: number };
  startsAt: string;
}

// Thresholds per ТЗ §6.3: venue within 150m, start time within ±15 minutes,
// fuzzy title match at ~90% similarity.
const VENUE_PROXIMITY_METERS = 150;
const TIME_WINDOW_MS = 15 * 60 * 1000;
const TITLE_SIMILARITY_THRESHOLD = 0.9;

/** True if two events are the same real-world event from different sources. */
export function isSameEvent(a: DedupCandidate, b: DedupCandidate): boolean {
  if (titleSimilarity(a.title, b.title) < TITLE_SIMILARITY_THRESHOLD) return false;
  if (distanceMeters(a.venue, b.venue) > VENUE_PROXIMITY_METERS) return false;
  const dt = Math.abs(new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return dt <= TIME_WINDOW_MS;
}

/** Deduplicates a list, keeping the first occurrence of each group. */
export function dedupEvents<T extends DedupCandidate>(events: T[]): T[] {
  const kept: T[] = [];
  for (const ev of events) {
    if (!kept.some((k) => isSameEvent(k, ev))) kept.push(ev);
  }
  return kept;
}
