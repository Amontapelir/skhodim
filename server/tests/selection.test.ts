import { describe, expect, it } from "vitest";
import { selectEvents } from "../src/domain/selection";
import type { Event } from "../src/domain/types";

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "1",
    externalId: "E1",
    source: "test",
    title: "Событие",
    normalizedTitle: "событие",
    description: null,
    venueId: "v1",
    category: "theatre",
    minAge: 0,
    price: 300,
    startsAt: "2026-10-10T19:00:00.000Z",
    purchaseUrl: "https://example.org",
    ...overrides,
  };
}

describe("selectEvents", () => {
  it("filters out events over balance", () => {
    const events = [makeEvent({ id: "cheap", price: 300 }), makeEvent({ id: "expensive", price: 5000 })];
    const result = selectEvents(events, { balance: 1000, cinemaLimit: 500, ageGroup: "16-17" });
    expect(result.events.map((e) => e.id)).toEqual(["cheap"]);
    expect(result.fallback).toBe(false);
  });

  it("filters cinema by cinemaLimit not balance", () => {
    const events = [makeEvent({ id: "cinema", category: "cinema", price: 400 })];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 300, ageGroup: "18-22" });
    expect(result.events).toHaveLength(0);
  });

  it("filters by age", () => {
    const events = [makeEvent({ id: "adult", minAge: 18 })];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "14-15" });
    expect(result.events).toHaveLength(0);
  });

  it("applies categories filter to include only the chosen categories", () => {
    const events = [
      makeEvent({ id: "cinema", category: "cinema", price: 300 }),
      makeEvent({ id: "theatre", category: "theatre" }),
      makeEvent({ id: "concert", category: "concert" }),
    ];
    const result = selectEvents(events, {
      balance: 5000,
      cinemaLimit: 2000,
      ageGroup: "18-22",
      categories: ["theatre"],
    });
    expect(result.events.map((e) => e.id)).toEqual(["theatre"]);
  });

  it("treats an empty categories list as no restriction", () => {
    const events = [makeEvent({ id: "cinema", category: "cinema", price: 300 }), makeEvent({ id: "theatre" })];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "18-22", categories: [] });
    expect(result.events.map((e) => e.id).sort()).toEqual(["cinema", "theatre"]);
  });

  it("applies ratings filter for an 'up to' range, independent of the user's own ageGroup", () => {
    const events = [
      makeEvent({ id: "kids", minAge: 6 }),
      makeEvent({ id: "teens", minAge: 16 }),
      makeEvent({ id: "adults", minAge: 18 }),
    ];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "18-22", ratings: [0, 6, 12, 16] });
    expect(result.events.map((e) => e.id).sort()).toEqual(["kids", "teens"]);
  });

  it("applies ratings filter to show only 18+ events", () => {
    const events = [
      makeEvent({ id: "kids", minAge: 6 }),
      makeEvent({ id: "teens", minAge: 16 }),
      makeEvent({ id: "adults", minAge: 18 }),
    ];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "18-22", ratings: [18] });
    expect(result.events.map((e) => e.id)).toEqual(["adults"]);
  });

  it("buckets an in-between minAge into its rating tier", () => {
    const events = [makeEvent({ id: "e", minAge: 14 })];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "18-22", ratings: [12] });
    expect(result.events.map((e) => e.id)).toEqual(["e"]);
  });

  it("applies afterHour filter", () => {
    const events = [
      makeEvent({ id: "morning", startsAt: "2026-10-10T10:00:00.000Z" }),
      makeEvent({ id: "evening", startsAt: "2026-10-10T19:00:00.000Z" }),
    ];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "18-22", afterHour: 18 });
    expect(result.events.map((e) => e.id)).toEqual(["evening"]);
  });

  it("applies beforeHour filter", () => {
    const events = [
      makeEvent({ id: "morning", startsAt: "2026-10-10T10:00:00.000Z" }),
      makeEvent({ id: "evening", startsAt: "2026-10-10T19:00:00.000Z" }),
    ];
    const result = selectEvents(events, { balance: 5000, cinemaLimit: 2000, ageGroup: "18-22", beforeHour: 12 });
    expect(result.events.map((e) => e.id)).toEqual(["morning"]);
  });

  it("combines afterHour and beforeHour into a custom range", () => {
    const events = [
      makeEvent({ id: "morning", startsAt: "2026-10-10T08:00:00.000Z" }),
      makeEvent({ id: "midday", startsAt: "2026-10-10T14:00:00.000Z" }),
      makeEvent({ id: "night", startsAt: "2026-10-10T23:00:00.000Z" }),
    ];
    const result = selectEvents(events, {
      balance: 5000,
      cinemaLimit: 2000,
      ageGroup: "18-22",
      afterHour: 12,
      beforeHour: 18,
    });
    expect(result.events.map((e) => e.id)).toEqual(["midday"]);
  });

  it("falls back to nearest alternatives when date window is empty", () => {
    const events = [makeEvent({ id: "later", startsAt: "2026-11-01T19:00:00.000Z" })];
    const result = selectEvents(events, {
      balance: 5000,
      cinemaLimit: 2000,
      ageGroup: "18-22",
      fromDate: "2026-10-01T00:00:00.000Z",
      toDate: "2026-10-05T00:00:00.000Z",
    });
    expect(result.fallback).toBe(true);
    expect(result.events.map((e) => e.id)).toEqual(["later"]);
  });
});
