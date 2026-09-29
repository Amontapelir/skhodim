import type { EventCard, IncomingCallback, IncomingMessage, InviteNotification, MessengerAdapter } from "./MessengerAdapter";

/**
 * In-memory mock with the same contract as the real MAX adapter. Outbound
 * messages/cards are logged and kept in `sent` for tests/manual inspection;
 * `simulateMessage`/`simulateCallback` let you drive the bot without MAX.
 */
export class MockMaxAdapter implements MessengerAdapter {
  readonly sent: Array<{ chatId: string; kind: "message" | "card"; content: string | EventCard }> = [];
  private messageHandlers: Array<(msg: IncomingMessage) => Promise<void>> = [];
  private callbackHandlers: Array<(cb: IncomingCallback) => Promise<void>> = [];

  async sendMessage(chatId: string, text: string): Promise<void> {
    this.sent.push({ chatId, kind: "message", content: text });
    console.log(`[mock-max -> ${chatId}] ${text}`);
  }

  async sendCard(chatId: string, card: EventCard): Promise<void> {
    this.sent.push({ chatId, kind: "card", content: card });
    console.log(`[mock-max -> ${chatId}] card: ${card.title} (${card.buttons.map((b) => b.label).join(", ")})`);
  }

  async sendInviteNotification(userId: string, notification: InviteNotification): Promise<void> {
    const text = `Тебя зовут: ${notification.eventTitle}\n${notification.eventSubtitle}`;
    this.sent.push({ chatId: userId, kind: "message", content: text });
    console.log(`[mock-max -> user:${userId}] ${text}`);
  }

  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  onCallback(handler: (cb: IncomingCallback) => Promise<void>): void {
    this.callbackHandlers.push(handler);
  }

  async simulateMessage(msg: IncomingMessage): Promise<void> {
    for (const h of this.messageHandlers) await h(msg);
  }

  async simulateCallback(cb: IncomingCallback): Promise<void> {
    for (const h of this.callbackHandlers) await h(cb);
  }
}
