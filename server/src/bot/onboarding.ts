import type { AgeGroup } from "../domain/types";
import type { MessengerAdapter } from "./MessengerAdapter";

export interface OnboardingProfile {
  balance: number | null;
  cinemaLimit: number | null;
  ageGroup: AgeGroup | null;
  step: "balance" | "cinemaLimit" | "ageGroup" | "done";
}

export interface ProfileStore {
  get(userId: string): Promise<OnboardingProfile | null>;
  save(userId: string, profile: OnboardingProfile): Promise<void>;
}

const AGE_GROUPS: AgeGroup[] = ["14-15", "16-17", "18-22"];

function freshProfile(): OnboardingProfile {
  return { balance: null, cinemaLimit: null, ageGroup: null, step: "balance" };
}

function parseAmount(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length === 0) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseAgeGroup(text: string): AgeGroup | null {
  const digits = text.replace(/[^\d]/g, "");
  const age = Number(digits);
  if (!Number.isFinite(age)) return null;
  if (age >= 14 && age <= 15) return "14-15";
  if (age >= 16 && age <= 17) return "16-17";
  if (age >= 18 && age <= 22) return "18-22";
  return null;
}

/**
 * Three-question onboarding: card balance, cinema sub-limit, age. Also
 * handles `/profile` to let the user correct any saved value afterwards.
 */
export async function handleOnboardingMessage(
  bot: MessengerAdapter,
  store: ProfileStore,
  chatId: string,
  userId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();

  if (trimmed === "/profile") {
    const existing = await store.get(userId);
    if (!existing || existing.step !== "done") {
      await bot.sendMessage(chatId, "Профиль ещё не заполнен. Ответьте на вопросы онбординга.");
      return;
    }
    await store.save(userId, freshProfile());
    await bot.sendMessage(
      chatId,
      `Текущие значения — остаток: ${existing.balance} ₽, кино-лимит: ${existing.cinemaLimit} ₽, возраст: ${existing.ageGroup}. Давайте обновим. Какой у вас остаток на Пушкинской карте?`
    );
    return;
  }

  let profile = await store.get(userId);
  if (!profile) {
    profile = freshProfile();
    await store.save(userId, profile);
    await bot.sendMessage(
      chatId,
      "Привет! «Сходим?» — независимый неофициальный сервис, не связан с оператором программы «Пушкинская карта», Минкультуры России или ВТБ.\n\nДавай настроим профиль. Какой у тебя остаток на Пушкинской карте (в рублях)?"
    );
    return;
  }

  if (profile.step === "balance") {
    const balance = parseAmount(trimmed);
    if (balance === null) {
      await bot.sendMessage(chatId, "Не понял сумму. Введите число, например: 3500");
      return;
    }
    profile.balance = balance;
    profile.step = "cinemaLimit";
    await store.save(userId, profile);
    await bot.sendMessage(chatId, "Сколько осталось на кино-лимите (до 2000 ₽/год)?");
    return;
  }

  if (profile.step === "cinemaLimit") {
    const cinemaLimit = parseAmount(trimmed);
    if (cinemaLimit === null) {
      await bot.sendMessage(chatId, "Не понял сумму. Введите число, например: 1200");
      return;
    }
    profile.cinemaLimit = cinemaLimit;
    profile.step = "ageGroup";
    await store.save(userId, profile);
    await bot.sendMessage(chatId, "Сколько тебе лет?");
    return;
  }

  if (profile.step === "ageGroup") {
    const ageGroup = parseAgeGroup(trimmed);
    if (ageGroup === null) {
      await bot.sendMessage(chatId, "Пушкинская карта доступна с 14 до 22 лет. Введите возраст числом.");
      return;
    }
    profile.ageGroup = ageGroup;
    profile.step = "done";
    await store.save(userId, profile);
    await bot.sendMessage(
      chatId,
      `Готово! Остаток: ${profile.balance} ₽, кино-лимит: ${profile.cinemaLimit} ₽, возраст: ${ageGroup}. Изменить значения можно командой /profile.`
    );
    return;
  }

  await bot.sendMessage(chatId, "Профиль уже заполнен. Используйте /profile, чтобы изменить значения.");
}

export const AGE_GROUP_LIST = AGE_GROUPS;
