export interface IncomingMessage {
  chatId: string;
  userId: string;
  text: string;
}

export interface IncomingCallback {
  chatId: string;
  userId: string;
  payload: string;
}

export interface EventCard {
  title: string;
  subtitle: string;
  buttons: Array<{ label: string; payload: string }>;
}

/**
 * Contract every messenger integration implements, so the mock and the real
 * MAX Bot API adapter are interchangeable.
 */
export interface MessengerAdapter {
  sendMessage(chatId: string, text: string): Promise<void>;
  sendCard(chatId: string, card: EventCard): Promise<void>;
  onMessage(handler: (msg: IncomingMessage) => Promise<void>): void;
  onCallback(handler: (cb: IncomingCallback) => Promise<void>): void;
}
