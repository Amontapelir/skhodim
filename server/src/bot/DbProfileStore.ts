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

  /**
   * Captures the display name MAX itself reports for this user (first/last
   * name from the bot_started/message_created payload) — not asked as an
   * onboarding question, so it doesn't add a 4th question on top of the
   * three required by ТЗ §3.1. Safe to call on every interaction: creates
   * the row with defaults if it doesn't exist yet, otherwise only touches
   * display_name.
   */
  async upsertDisplayName(userId: string, displayName: string): Promise<void> {
    await db("users")
      .insert({ max_user_id: userId, display_name: displayName, balance: 0, cinema_limit: 0, onboarding_step: "balance" })
      .onConflict("max_user_id")
      .merge(["display_name"]);
  }
}
