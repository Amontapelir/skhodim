/** Age-rating tiers events are bucketed into, independent of the viewer's own age. */
export const RATING_TIERS = [0, 6, 12, 16, 18];

export function ratingTierOf(minAge: number): number {
  let tier = RATING_TIERS[0];
  for (const t of RATING_TIERS) {
    if (minAge >= t) tier = t;
  }
  return tier;
}
