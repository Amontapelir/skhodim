import { db } from "../db/knex";
import type { OnboardingProfile, ProfileStore } from "./onboarding";
import type { AgeGroup } from "../domain/types";

/** Persists onboarding progress on the `users` row, keyed by MAX user id. */
export class DbProfileStore implements ProfileStore {
  async get(userId: string): Promise<OnboardingProfile | null> {
    const row = await db("users").where({ max_user_id: userId }).first();
    if (!row) return null;
    return {
      balance: row.balance,
      cinemaLimit: row.cinema_limit,
      ageGroup: (row.age_group as AgeGroup | null) ?? null,
      step: row.onboarding_complete ? "done" : (row.onboarding_step as OnboardingProfile["step"]) ?? "balance",
    };
  }

  async save(userId: string, profile: OnboardingProfile): Promise<void> {
    await db("users")
      .insert({
        max_user_id: userId,
        balance: profile.balance ?? 0,
        cinema_limit: profile.cinemaLimit ?? 0,
        age_group: profile.ageGroup,
        onboarding_step: profile.step,
        onboarding_complete: profile.step === "done",
      })
      .onConflict("max_user_id")
      .merge(["balance", "cinema_limit", "age_group", "onboarding_step", "onboarding_complete"]);
  }
}
