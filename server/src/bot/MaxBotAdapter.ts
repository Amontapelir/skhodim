import { Bot, Keyboard } from "@maxhub/max-bot-api";
import { config } from "../config";
import type { EventCard, IncomingCallback, IncomingMessage, MessengerAdapter } from "./MessengerAdapter";

/**
 * Real MAX Bot API adapter, built on the official @maxhub/max-bot-api SDK
 * (https://github.com/max-messenger/max-bot-api-client-ts). Long polling
 * (bot.start()) rather than a webhook — simpler to wire up, and Render's
 * free tier sleeps on inactivity either way, so a webhook wouldn't avoid
 * that class of problem.
 */
export class MaxBotAdapter implements MessengerAdapter {
  private readonly bot: Bot;

  constructor(botToken: string = config.maxBotToken) {
    if (!botToken || botToken.startsWith("[")) {
      throw new Error("MAX_BOT_TOKEN not configured. See README for how to obtain it.");
    }
    this.bot = new Bot(botToken);

    // Entry point into the mini-app: MAX's own "start" screen for the bot.
    this.bot.on("bot_started", async (ctx) => {
      await ctx.reply("Привет! «Сходим?» — независимый неофициальный сервис для держателей Пушкинской карты.", {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.openApp("Открыть Сходим?", config.miniappUrl)]]),
        ],
      });
    });
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    await this.bot.api.sendMessageToChat(Number(chatId), text);
  }

  async sendCard(chatId: string, card: EventCard): Promise<void> {
    const keyboard = Keyboard.inlineKeyboard([
      card.buttons.map((b) => Keyboard.button.callback(b.label, b.payload)),
    ]);
    await this.bot.api.sendMessageToChat(Number(chatId), `${card.title}\n${card.subtitle}`, {
      attachments: [keyboard],
    });
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    // ctx.user is typed as `undefined` for message_created in this SDK
    // version (a real typing gap — it works fine for message_callback),
    // though it's populated correctly at runtime. Read the sender off the
    // message itself instead, which is properly typed.
    this.bot.on("message_created", async (ctx) => {
      const text = ctx.message?.body.text;
      const senderId = ctx.message?.sender?.user_id;
      if (text == null || ctx.chatId == null || senderId == null) return;
      await handler({ chatId: String(ctx.chatId), userId: String(senderId), text });
    });
  }

  onCallback(handler: (cb: IncomingCallback) => Promise<void>): void {
    this.bot.action(/.*/, async (ctx) => {
      if (ctx.chatId == null) return;
      const { callback } = ctx.update;
      await handler({
        chatId: String(ctx.chatId),
        userId: String(callback.user.user_id),
        payload: callback.payload ?? "",
      });
      // Acknowledges the tap so the button stops showing a loading spinner.
      await ctx.answerOnCallback({});
    });
  }

  start(): void {
    this.bot.start();
  }
}
