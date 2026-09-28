export type AgeGroup = "14-15" | "16-17" | "18-22";

export interface EventDto {
  id: string;
  title: string;
  description: string | null;
  category: string;
  minAge: number;
  price: number;
  startsAt: string;
  purchaseUrl: string;
  venueId: string;
  venue: { name: string; address: string; lat: number; lon: number; district: string | null } | null;
}

export interface EventsResponse {
  events: EventDto[];
  fallback: boolean;
}

export interface InviteListItem {
  inviteId: string;
  event: EventDto;
  fitsBalance: boolean;
  /** How much the price exceeds the recipient's remaining budget, in ₽. 0 when it fits. */
  shortfall: number;
  myStatus: "pending" | "going" | "cannot" | "propose_other_date";
  responses: Array<{
    userMaxId: string;
    displayName: string | null;
    status: string;
    proposedDate: string | null;
  }>;
}

export interface Contact {
  maxUserId: string;
  displayName: string | null;
}

// In dev, Vite proxies "/api" to the local backend (see vite.config.ts).
// In production there's no such proxy, so the backend's full URL must be
// baked in at build time via VITE_API_BASE_URL.
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchEvents(params: {
  balance: number;
  cinemaLimit: number;
  ageGroup: AgeGroup;
  afterHour?: number;
  beforeHour?: number;
  categories?: string[];
  ratings?: number[];
  districts?: string[];
}): Promise<EventsResponse> {
  const q = new URLSearchParams({
    balance: String(params.balance),
    cinemaLimit: String(params.cinemaLimit),
    ageGroup: params.ageGroup,
  });
  if (params.afterHour !== undefined) q.set("afterHour", String(params.afterHour));
  if (params.beforeHour !== undefined) q.set("beforeHour", String(params.beforeHour));
  if (params.categories && params.categories.length > 0) q.set("categories", params.categories.join(","));
  if (params.ratings && params.ratings.length > 0) q.set("ratings", params.ratings.join(","));
  if (params.districts && params.districts.length > 0) q.set("districts", params.districts.join(","));
  const res = await fetch(`${BASE}/events?${q}`);
  if (!res.ok) throw new Error(`fetchEvents failed: ${res.status}`);
  return res.json();
}

export async function fetchIncomingInvites(maxUserId: string): Promise<InviteListItem[]> {
  const res = await fetch(`${BASE}/users/${maxUserId}/invites`);
  if (!res.ok) throw new Error(`fetchIncomingInvites failed: ${res.status}`);
  return res.json();
}

export async function fetchContacts(maxUserId: string): Promise<Contact[]> {
  const res = await fetch(`${BASE}/users/${maxUserId}/contacts`);
  if (!res.ok) throw new Error(`fetchContacts failed: ${res.status}`);
  return res.json();
}

export async function respondToInvite(
  inviteId: string,
  maxUserId: string,
  status: "going" | "cannot" | "propose_other_date",
  proposedDate?: string
): Promise<void> {
  const res = await fetch(`${BASE}/invites/${inviteId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxUserId, status, proposedDate }),
  });
  if (!res.ok) throw new Error(`respondToInvite failed: ${res.status}`);
}

export async function createInvite(eventId: string, fromMaxUserId: string, toMaxUserIds: string[]): Promise<void> {
  const res = await fetch(`${BASE}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, fromMaxUserId, toMaxUserIds }),
  });
  if (!res.ok) throw new Error(`createInvite failed: ${res.status}`);
}

export async function markPurchased(maxUserId: string, eventId: string): Promise<void> {
  const res = await fetch(`${BASE}/users/${maxUserId}/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId }),
  });
  if (!res.ok) throw new Error(`markPurchased failed: ${res.status}`);
}
