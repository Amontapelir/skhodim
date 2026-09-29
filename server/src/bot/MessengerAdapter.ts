export interface IncomingMessage {
  chatId: string;
  userId: string;
  text: string;
  /** The name MAX itself reports for this user, when the adapter can provide it (e.g. real MAX; absent for the mock). */
  displayName?: string;
}

export interface IncomingCallback {
  chatId: string;
  userId: string;
  payload: string;
}

export interface IncomingStart {
  chatId: string;
  userId: string;
  /** The name MAX itself reports for this user, when the adapter can provide it (e.g. real MAX; absent for the mock). */
  displayName?: string;
}

export interface EventCard {
  title: string;
  subtitle: string;
  buttons: Array<{ label: string; payload: string }>;
}

export interface InviteNotification {
  eventTitle: string;
  eventSubtitle: string;
  fromDisplayName: string | null;
  comment: string | null;
}

export interface ShareableCardContent {
  title: string;
  subtitle: string;
}

/**
 * Contract every messenger integration implements, so the mock and the real
 * MAX Bot API adapter are interchangeable.
 */
export interface MessengerAdapter {
  sendMessage(chatId: string, text: string): Promise<void>;
  sendCard(chatId: string, card: EventCard): Promise<void>;
  /** Notifies a specific user (by their messenger user id, not a chat id) that they've been invited to an event. */
  sendInviteNotification(userId: string, notification: InviteNotification): Promise<void>;
  /**
   * Sends the card to the user's own dialog with the bot and returns the
   * message id (`mid`), so the mini-app can hand it to MAX Bridge's
   * `shareMaxContent({ mid, chatType: "DIALOG" })` and let the user forward
   * it to any real MAX contact or group chat via MAX's own native picker —
   * see https://dev.max.ru/docs/webapps/bridge ("Шеринг контента").
   */
  sendShareableCard(userId: string, content: ShareableCardContent): Promise<{ mid: string }>;
  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void;
  onCallback(handler: (cb: IncomingCallback) => Promise<void>): void;
  /** Fired when a user opens the bot for the first time ("bot_started" in MAX). Optional — no equivalent event in the mock. */
  onStart?(handler: (start: IncomingStart) => Promise<void>): void;
  /** Begin receiving updates (long polling for the real adapter). No-op for the mock. */
  start?(): void;
}
