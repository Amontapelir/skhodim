import { Bot, Keyboard } from "@maxhub/max-bot-api";
import { config } from "../config";
import type {
  EventCard,
  IncomingCallback,
  IncomingMessage,
  IncomingStart,
  InviteNotification,
  MessengerAdapter,
} from "./MessengerAdapter";

/**
 * Real MAX Bot API adapter, built on the official @maxhub/max-bot-api SDK
 * (https://github.com/max-messenger/max-bot-api-client-ts). Long polling
 * (bot.start()) rather than a webhook — simpler to wire up, and Render's
 * free tier sleeps on inactivity either way, so a webhook wouldn't avoid
 * that class of problem.
 */
export class MaxBotAdapter implements MessengerAdapter {
  private readonly bot: Bot;
  private startHandlers: Array<(start: IncomingStart) => Promise<void>> = [];

  constructor(botToken: string = config.maxBotToken) {
    if (!botToken || botToken.startsWith("[")) {
      throw new Error("MAX_BOT_TOKEN not configured. See README for how to obtain it.");
    }
    this.bot = new Bot(botToken);

    // Entry point into the mini-app: MAX's own "start" screen for the bot.
    // Sends the "Открыть" button, then runs the onboarding start handler
    // (asks the card balance) so the user isn't left waiting on a blank chat.
    this.bot.on("bot_started", async (ctx) => {
      await ctx.reply("Привет! «Сходим?» — независимый неофициальный сервис для держателей Пушкинской карты.", {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.openApp("Открыть Сходим?", config.miniappUrl)]]),
        ],
      });
      if (ctx.chatId == null) return;
      const chatId = String(ctx.chatId);
      const userId = String(ctx.update.user.user_id);
      for (const handler of this.startHandlers) {
        await handler({ chatId, userId });
      }
    });
  }

  onStart(handler: (start: IncomingStart) => Promise<void>): void {
    this.startHandlers.push(handler);
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

  async sendInviteNotification(userId: string, notification: InviteNotification): Promise<void> {
    const heading = notification.fromDisplayName
      ? `🎟️ ${notification.fromDisplayName} зовёт на «${notification.eventTitle}»`
      : `🎟️ Тебя зовут на «${notification.eventTitle}»`;
    const lines = [heading, `📍 ${notification.eventSubtitle}`];
    if (notification.comment) lines.push(`💬 «${notification.comment}»`);

    // sendMessageToUser reaches the user's 1:1 dialog with the bot directly
    // by user_id — no need to know/store a chat_id for them.
    await this.bot.api.sendMessageToUser(Number(userId), lines.join("\n"), {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.openApp("Смотреть в Сходим?", config.miniappUrl)]])],
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
    // bot.start() is async — if this rejects (bad token, network/TLS issue)
    // without a .catch(), Node treats it as an unhandled rejection and kills
    // the whole process, taking the rest of the API down with it. A
    // synchronous try/catch around the call site does NOT catch this.
    this.bot.start().catch((err) => {
      console.error("MaxBotAdapter: bot.start() failed, MAX bot will not receive updates:", err);
    });
  }
}
