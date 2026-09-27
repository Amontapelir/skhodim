export interface RawEvent {
  externalId: string;
  source: "test" | "proculture" | "kudago";
  title: string;
  venue: { name: string; address: string; lat: number; lon: number };
  category: string;
  minAge: number;
  price: number;
  startsAt: string;
  purchaseUrl: string;
}

export interface EventSource {
  fetchEvents(): Promise<RawEvent[]>;
}
