import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config";
import { registerEventRoutes } from "./routes/events";
import { registerProfileRoutes } from "./routes/profile";
import { registerInviteRoutes } from "./routes/invites";
import { MockMaxAdapter } from "./bot/MockMaxAdapter";
import { MaxBotAdapter } from "./bot/MaxBotAdapter";
import { DbProfileStore } from "./bot/DbProfileStore";
import { handleOnboardingMessage } from "./bot/onboarding";
import type { MessengerAdapter } from "./bot/MessengerAdapter";

const app = Fastify({ logger: true });

app.register(cors, { origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",") });

registerEventRoutes(app);
registerProfileRoutes(app);
registerInviteRoutes(app);

// A bad/missing MAX_BOT_TOKEN must not take down the whole app — the rest of
// the API (events, invites, mini-app) works fine without a live bot.
function createBotAdapter(): MessengerAdapter {
  if (config.botAdapter === "max") {
    try {
      return new MaxBotAdapter();
    } catch (err) {
      app.log.error({ err }, "MaxBotAdapter init failed, falling back to mock");
    }
  }
  return new MockMaxAdapter();
}

const bot = createBotAdapter();
const profileStore = new DbProfileStore();

bot.onMessage(async (msg) => {
  await handleOnboardingMessage(bot, profileStore, msg.chatId, msg.userId, msg.text);
});

try {
  bot.start?.();
} catch (err) {
  app.log.error({ err }, "bot.start() failed — continuing without live MAX updates");
}

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Skhodim server listening on ${address}`);
});
