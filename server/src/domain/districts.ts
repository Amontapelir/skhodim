// Moscow's 12 administrative districts, approximated by their rough centroid.
// A venue is assigned to whichever centroid is nearest by straight-line
// distance — a coarse approximation (borders don't follow straight lines),
// good enough for a browse filter, computed once at seed time and cached on
// the venue row rather than calling a geocoder per request.
export const MOSCOW_DISTRICTS: Array<{ name: string; lat: number; lon: number }> = [
  { name: "ЦАО", lat: 55.753, lon: 37.62 },
  { name: "САО", lat: 55.838, lon: 37.525 },
  { name: "СВАО", lat: 55.863, lon: 37.64 },
  { name: "ВАО", lat: 55.788, lon: 37.775 },
  { name: "ЮВАО", lat: 55.7, lon: 37.755 },
  { name: "ЮАО", lat: 55.617, lon: 37.66 },
  { name: "ЮЗАО", lat: 55.65, lon: 37.55 },
  { name: "ЗАО", lat: 55.716, lon: 37.451 },
  { name: "СЗАО", lat: 55.815, lon: 37.45 },
  { name: "Зеленоградский", lat: 55.987, lon: 37.182 },
  { name: "Новомосковский", lat: 55.45, lon: 37.32 },
  { name: "Троицкий", lat: 55.335, lon: 37.14 },
];

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestDistrict(lat: number, lon: number): string {
  let best = MOSCOW_DISTRICTS[0];
  let bestDist = Infinity;
  for (const d of MOSCOW_DISTRICTS) {
    const dist = distanceKm({ lat, lon }, d);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best.name;
}
