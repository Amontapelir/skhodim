import { readFileSync } from "fs";
import { join } from "path";
import type { EventSource, RawEvent } from "./EventSource";

interface TestJsonFile {
  meta: { source: string; generatedAt: string; note: string };
  events: Array<{
    externalId: string;
    source: string;
    title: string;
    venue: { name: string; address: string; lat: number; lon: number };
    category: string;
    minAge: number;
    price: number;
    startsAt: string;
    purchaseUrl: string;
  }>;
}

const DATA_PATH = join(__dirname, "..", "..", "data", "events.test.json");

export class TestJsonSource implements EventSource {
  async fetchEvents(): Promise<RawEvent[]> {
    const raw = readFileSync(DATA_PATH, "utf-8");
    const parsed: TestJsonFile = JSON.parse(raw);
    return parsed.events.map((e) => ({ ...e, source: "test" as const }));
  }
}
