import { describe, expect, it } from "vitest";
import { dedupEvents, isSameEvent, normalizeTitle, titleSimilarity } from "../src/domain/dedup";

describe("normalizeTitle", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeTitle("«Чайка»!")).toBe("чайка");
  });
});

describe("titleSimilarity", () => {
  it("is 1 for identical (normalized) titles", () => {
    expect(titleSimilarity("Чайка", "чайка!")).toBe(1);
  });

  it("is high but not perfect for a minor punctuation variant", () => {
    const ratio = titleSimilarity("Стендап-вечер", "Стендап вечер");
    expect(ratio).toBeGreaterThanOrEqual(0.9);
    expect(ratio).toBeLessThan(1);
  });

  it("is low for unrelated titles", () => {
    expect(titleSimilarity("Чайка", "Онегин")).toBeLessThan(0.9);
  });
});

describe("isSameEvent", () => {
  const base = {
    title: "Чайка",
    venue: { lat: 55.7644, lon: 37.6531 },
    startsAt: "2026-10-05T18:00:00.000Z",
  };

  it("matches same title, nearby venue (<150m), close time (<=15min)", () => {
    expect(
      isSameEvent(base, {
        title: "чайка!",
        venue: { lat: 55.7645, lon: 37.6532 },
        startsAt: "2026-10-05T18:10:00.000Z",
      })
    ).toBe(true);
  });

  it("matches a fuzzy title (punctuation variant) within threshold", () => {
    expect(isSameEvent({ ...base, title: "Стендап-вечер" }, { ...base, title: "Стендап вечер" })).toBe(true);
  });

  it("rejects venue farther than 150m", () => {
    expect(
      isSameEvent(base, { ...base, venue: { lat: 55.7665, lon: 37.6531 } })
    ).toBe(false);
  });

  it("rejects time gap larger than 15 minutes", () => {
    expect(
      isSameEvent(base, { ...base, startsAt: "2026-10-05T18:20:00.000Z" })
    ).toBe(false);
  });

  it("rejects different title", () => {
    expect(isSameEvent(base, { ...base, title: "Онегин" })).toBe(false);
  });
});

describe("dedupEvents", () => {
  it("keeps first occurrence of duplicates", () => {
    const a = { title: "Чайка", venue: { lat: 55.7644, lon: 37.6531 }, startsAt: "2026-10-05T18:00:00.000Z" };
    const b = { title: "Чайка!", venue: { lat: 55.7645, lon: 37.6531 }, startsAt: "2026-10-05T18:05:00.000Z" };
    const c = { title: "Онегин", venue: { lat: 55.75, lon: 37.6 }, startsAt: "2026-10-06T18:00:00.000Z" };
    expect(dedupEvents([a, b, c])).toEqual([a, c]);
  });
});
