export type AgeGroup = "14-15" | "16-17" | "18-22";

export interface User {
  id: string;
  maxUserId: string;
  displayName: string | null;
  ageGroup: AgeGroup | null;
  balance: number;
  cinemaLimit: number;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  district: string | null;
}

export type EventCategory = "cinema" | "theatre" | "concert" | "museum" | "exhibition" | "other";

export interface Event {
  id: string;
  externalId: string;
  source: "test" | "proculture" | "kudago";
  title: string;
  normalizedTitle: string;
  description: string | null;
  venueId: string;
  category: EventCategory;
  minAge: number;
  price: number;
  startsAt: string;
  purchaseUrl: string;
  /** Denormalized from the venue by the route layer for filtering; absent until then. */
  district?: string | null;
}

export type InviteResponseStatus = "pending" | "going" | "cannot" | "propose_other_date";

export interface Invite {
  id: string;
  eventId: string;
  fromUserId: string;
  createdAt: string;
}

export interface InviteResponse {
  id: string;
  inviteId: string;
  userId: string;
  status: InviteResponseStatus;
  proposedDate: string | null;
  respondedAt: string | null;
}
