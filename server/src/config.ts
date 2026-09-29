import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
  eventSource: (process.env.EVENT_SOURCE ?? "test") as "test" | "proculture" | "kudago",
  proCulture: {
    apiKey: process.env.PRO_CULTURE_API_KEY ?? "",
    baseUrl: process.env.PRO_CULTURE_API_BASE_URL ?? "",
    eventsPath: process.env.PRO_CULTURE_EVENTS_PATH ?? "/events",
  },
  botAdapter: (process.env.BOT_ADAPTER ?? "mock") as "mock" | "max",
  maxBotToken: process.env.MAX_BOT_TOKEN ?? "",
  /** Mini-app URL, used for the "Открыть" button MaxBotAdapter sends on bot_started. */
  miniappUrl: process.env.MINIAPP_URL ?? "https://skhodim-miniapp.onrender.com",
  /** Comma-separated allowed origins for the frontend, or "*" for any (dev default). */
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
