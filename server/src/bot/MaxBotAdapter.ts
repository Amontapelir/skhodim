import { config } from "../config";
import type { EventCard, IncomingCallback, IncomingMessage, MessengerAdapter } from "./MessengerAdapter";

/**
 * Real MAX Bot API adapter. Exact endpoint paths and payload shape depend on
 * the MAX Bot API docs — fill in once available; the mock adapter follows
 * the same MessengerAdapter contract so the rest of the app doesn't change.
 */
export class MaxBotAdapter implements MessengerAdapter {
  constructor(private readonly botToken: string = config.maxBotToken) {
    if (!this.botToken || this.botToken.startsWith("[")) {
      throw new Error("MAX_BOT_TOKEN not configured. See README for how to obtain it.");
    }
  }

  async sendMessage(_chatId: string, _text: string): Promise<void> {
    throw new Error("MaxBotAdapter.sendMessage: реализовать по документации MAX Bot API.");
  }

  async sendCard(_chatId: string, _card: EventCard): Promise<void> {
    throw new Error("MaxBotAdapter.sendCard: реализовать по документации MAX Bot API.");
  }

  onMessage(_handler: (msg: IncomingMessage) => Promise<void>): void {
    throw new Error("MaxBotAdapter.onMessage: подключить вебхук/long-poll MAX Bot API.");
  }

  onCallback(_handler: (cb: IncomingCallback) => Promise<void>): void {
    throw new Error("MaxBotAdapter.onCallback: подключить вебхук/long-poll MAX Bot API.");
  }
}
