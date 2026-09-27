import type { AgeGroup, Event } from "./types";
import { ratingTierOf } from "./ratings";

const AGE_GROUP_MIN: Record<AgeGroup, number> = {
  "14-15": 14,
  "16-17": 16,
  "18-22": 18,
};

export interface SelectionFilters {
  balance: number;
  cinemaLimit: number;
  ageGroup: AgeGroup;
  /** Time-of-day window, in hours (0-23). Both ends optional and independent. */
  afterHour?: number;
  beforeHour?: number;
  /** Only these categories are shown. Undefined/empty means no restriction. */
  categories?: string[];
  /** Only events whose rating tier (0/6/12/16/18) is in this list are shown. Independent of the user's own ageGroup. */
  ratings?: number[];
  fromDate?: string;
  toDate?: string;
}

function fits(event: Event, filters: SelectionFilters): boolean {
  const userAge = AGE_GROUP_MIN[filters.ageGroup];
  if (event.minAge > userAge) return false;

  const isCinema = event.category === "cinema";
  const budget = isCinema ? filters.cinemaLimit : filters.balance;
  if (event.price > budget) return false;

  if (filters.categories && filters.categories.length > 0 && !filters.categories.includes(event.category)) {
    return false;
  }
  if (filters.ratings && filters.ratings.length > 0 && !filters.ratings.includes(ratingTierOf(event.minAge))) {
    return false;
  }

  const hour = new Date(event.startsAt).getUTCHours();
  if (filters.afterHour !== undefined && hour < filters.afterHour) return false;
  if (filters.beforeHour !== undefined && hour >= filters.beforeHour) return false;

  const startsAt = new Date(event.startsAt).getTime();
  if (filters.fromDate && startsAt < new Date(filters.fromDate).getTime()) return false;
  if (filters.toDate && startsAt > new Date(filters.toDate).getTime()) return false;

  return true;
}

export interface SelectionResult {
  events: Event[];
  /** Set when the strict filters produced no results and we relaxed the date window to suggest alternatives. */
  fallback: boolean;
}

/**
 * Filters events by the user's constraints. If nothing matches, drops the date
 * window and returns the closest upcoming matches instead of an empty list.
 */
export function selectEvents(events: Event[], filters: SelectionFilters): SelectionResult {
  const strict = events.filter((e) => fits(e, filters));
  if (strict.length > 0) {
    return { events: sortByDate(strict), fallback: false };
  }

  const { fromDate, toDate, ...withoutDateWindow } = filters;
  const relaxed = events.filter((e) => fits(e, withoutDateWindow));
  return { events: sortByDate(relaxed).slice(0, 5), fallback: true };
}

function sortByDate(events: Event[]): Event[] {
  return [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
