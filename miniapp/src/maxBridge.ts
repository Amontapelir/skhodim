// Thin wrapper around window.WebApp (MAX Bridge, loaded via <script> in
// index.html — see https://dev.max.ru/docs/webapps/bridge). Only the subset
// of the API this app actually uses is typed; everything here degrades
// gracefully when window.WebApp is absent (local dev, plain browser preview).

interface MaxWebAppInitData {
  user?: { id: number };
}

interface MaxWebApp {
  initDataUnsafe?: MaxWebAppInitData;
  shareMaxContent?: (
    params: { text?: string; link?: string } | { mid: string; chatType: "DIALOG" | "CHAT" }
  ) => void;
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
  }
}

/** The current user's MAX id from Bridge init data, or null outside a real MAX client. */
export function getMaxUserId(): string | null {
  const id = window.WebApp?.initDataUnsafe?.user?.id;
  return id != null ? String(id) : null;
}

/**
 * True only inside a real MAX client. The max-web-app.js script always
 * defines window.WebApp and all its methods (including shareMaxContent) even
 * in a plain browser tab — there's just no native host behind them there, so
 * calls silently do nothing. Checking for a populated user id from init data
 * is what actually tells a real MAX session apart from a bare page load.
 */
export function canShareViaMaxBridge(): boolean {
  return typeof window.WebApp?.shareMaxContent === "function" && getMaxUserId() !== null;
}

/**
 * Opens MAX's native forward screen for a message the bot already sent
 * (see server's POST /events/:eventId/share-card) so the user can pick any
 * real MAX contact or group chat — not just contacts our bot already knows.
 */
export function shareMessageViaMaxBridge(mid: string): void {
  window.WebApp?.shareMaxContent?.({ mid, chatType: "DIALOG" });
}
