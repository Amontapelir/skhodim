import { config } from "../config";
import type { EventSource, RawEvent } from "./EventSource";

/**
 * Adapter for the PRO.Культура.РФ partner API. The key travels in every
 * request's query string (documented `apiKey` param), so it must never be
 * logged verbatim — see maskApiKeyInUrl.
 */
export class ProCultureSource implements EventSource {
  async fetchEvents(): Promise<RawEvent[]> {
    const { baseUrl, eventsPath, apiKey } = config.proCulture;
    if (!baseUrl || !apiKey || baseUrl.startsWith("[") || apiKey.startsWith("[")) {
      throw new Error(
        "PRO_CULTURE_API_BASE_URL / PRO_CULTURE_API_KEY not configured. See README for how to request them."
      );
    }

    const url = new URL(eventsPath, baseUrl);
    url.searchParams.set("apiKey", apiKey);

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error(`PRO.Культура.РФ request failed: ${(err as Error).message}`);
    }

    if (response.status === 403) {
      throw new Error(
        `PRO.Культура.РФ вернул 403 для ${maskApiKeyInUrl(url.toString())} — ключ недействителен или партнёрство завершено.`
      );
    }
    if (!response.ok) {
      throw new Error(`PRO.Культура.РФ вернул ${response.status} для ${maskApiKeyInUrl(url.toString())}`);
    }

    const body = await response.json();
    return mapResponseToRawEvents(body);
  }
}

export function maskApiKeyInUrl(url: string): string {
  return url.replace(/([?&]apiKey=)[^&]+/i, "$1***");
}

// Exact response shape depends on the partner API contract received with the key.
function mapResponseToRawEvents(body: unknown): RawEvent[] {
  throw new Error(
    "ProCultureSource.mapResponseToRawEvents: реализовать по документации, выданной вместе с ключом партнёра."
  );
}
