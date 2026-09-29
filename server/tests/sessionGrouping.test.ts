import { describe, expect, it } from "vitest";
import { groupBySession } from "../src/domain/sessionGrouping";
import type { Event } from "../src/domain/types";

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "1",
    externalId: "E1",
    source: "test",
    title: "Дюна: Пророчество",
    normalizedTitle: "дюна пророчество",
    description: null,
    venueId: "v1",
    category: "cinema",
    minAge: 16,
    price: 300,
    startsAt: "2026-10-10T19:00:00.000Z",
    purchaseUrl: "https://example.org",
    ...overrides,
  };
}

describe("groupBySession", () => {
  it("leaves a single-session event untouched", () => {
    const [result] = groupBySession([makeEvent({ id: "a" })]);
    expect(result.id).toBe("a");
    expect(result.sessions).toBeUndefined();
  });

  it("groups same title+venue into one card with a sessions array", () => {
    const events = [
      makeEvent({ id: "a", startsAt: "2026-10-10T19:00:00.000Z", price: 300 }),
      makeEvent({ id: "b", startsAt: "2026-10-10T13:00:00.000Z", price: 250 }),
      makeEvent({ id: "c", startsAt: "2026-10-10T16:00:00.000Z", price: 280 }),
    ];
    const result = groupBySession(events);
    expect(result).toHaveLength(1);
    // Earliest session becomes the representative card.
    expect(result[0].id).toBe("b");
    expect(result[0].startsAt).toBe("2026-10-10T13:00:00.000Z");
    expect(result[0].sessions).toEqual([
      { id: "b", startsAt: "2026-10-10T13:00:00.000Z", price: 250 },
      { id: "c", startsAt: "2026-10-10T16:00:00.000Z", price: 280 },
      { id: "a", startsAt: "2026-10-10T19:00:00.000Z", price: 300 },
    ]);
  });

  it("keeps different venues separate even with the same title", () => {
    const events = [
      makeEvent({ id: "a", venueId: "v1" }),
      makeEvent({ id: "b", venueId: "v2" }),
    ];
    const result = groupBySession(events);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.sessions === undefined)).toBe(true);
  });

  it("keeps different (normalized) titles at the same venue separate", () => {
    const events = [
      makeEvent({ id: "a", title: "Дюна: Пророчество", normalizedTitle: "дюна пророчество" }),
      makeEvent({ id: "b", title: "Чайка", normalizedTitle: "чайка" }),
    ];
    const result = groupBySession(events);
    expect(result).toHaveLength(2);
  });
});
