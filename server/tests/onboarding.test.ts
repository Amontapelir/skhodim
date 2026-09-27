import { describe, expect, it } from "vitest";
import { MockMaxAdapter } from "../src/bot/MockMaxAdapter";
import { handleOnboardingMessage, type OnboardingProfile, type ProfileStore } from "../src/bot/onboarding";

function inMemoryStore(): ProfileStore {
  const profiles = new Map<string, OnboardingProfile>();
  return {
    async get(userId) {
      return profiles.get(userId) ?? null;
    },
    async save(userId, profile) {
      profiles.set(userId, profile);
    },
  };
}

describe("onboarding", () => {
  it("walks through balance, cinema limit, age and completes", async () => {
    const bot = new MockMaxAdapter();
    const store = inMemoryStore();
    const chatId = "chat1";
    const userId = "user1";

    await handleOnboardingMessage(bot, store, chatId, userId, "/start");
    await handleOnboardingMessage(bot, store, chatId, userId, "3500");
    await handleOnboardingMessage(bot, store, chatId, userId, "1200");
    await handleOnboardingMessage(bot, store, chatId, userId, "17");

    const profile = await store.get(userId);
    expect(profile).toEqual({ balance: 3500, cinemaLimit: 1200, ageGroup: "16-17", step: "done" });

    const lastMessage = bot.sent.at(-1);
    expect(lastMessage?.content).toContain("Готово!");
  });

  it("re-asks on invalid input without advancing step", async () => {
    const bot = new MockMaxAdapter();
    const store = inMemoryStore();
    await handleOnboardingMessage(bot, store, "chat1", "user1", "/start");
    await handleOnboardingMessage(bot, store, "chat1", "user1", "не число");

    const profile = await store.get("user1");
    expect(profile?.step).toBe("balance");
  });

  it("/profile resets and lets user correct values", async () => {
    const bot = new MockMaxAdapter();
    const store = inMemoryStore();
    await handleOnboardingMessage(bot, store, "chat1", "user1", "/start");
    await handleOnboardingMessage(bot, store, "chat1", "user1", "3500");
    await handleOnboardingMessage(bot, store, "chat1", "user1", "1200");
    await handleOnboardingMessage(bot, store, "chat1", "user1", "17");

    await handleOnboardingMessage(bot, store, "chat1", "user1", "/profile");
    let profile = await store.get("user1");
    expect(profile?.step).toBe("balance");

    await handleOnboardingMessage(bot, store, "chat1", "user1", "4000");
    await handleOnboardingMessage(bot, store, "chat1", "user1", "2000");
    await handleOnboardingMessage(bot, store, "chat1", "user1", "18");
    profile = await store.get("user1");
    expect(profile).toEqual({ balance: 4000, cinemaLimit: 2000, ageGroup: "18-22", step: "done" });
  });
});
