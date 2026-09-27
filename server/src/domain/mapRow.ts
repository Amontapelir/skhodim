import { normalizeTitle } from "./dedup";
import type { Event, EventCategory, InviteResponseStatus, User } from "./types";

export function eventRowToDomain(row: any): Event {
  return {
    id: row.id,
    externalId: row.external_id,
    source: row.source,
    title: row.title,
    normalizedTitle: row.normalized_title ?? normalizeTitle(row.title),
    venueId: row.venue_id,
    category: row.category as EventCategory,
    minAge: row.min_age,
    price: row.price,
    startsAt: new Date(row.starts_at).toISOString(),
    purchaseUrl: row.purchase_url,
  };
}

export function userRowToDomain(row: any): User {
  return {
    id: row.id,
    maxUserId: row.max_user_id,
    displayName: row.display_name,
    ageGroup: row.age_group,
    balance: row.balance,
    cinemaLimit: row.cinema_limit,
    onboardingComplete: row.onboarding_complete,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function inviteResponseStatusFromString(s: string): InviteResponseStatus {
  return s as InviteResponseStatus;
}
