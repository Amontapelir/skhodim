import { useEffect, useRef } from "react";
import type { EventDto } from "../api";
import { categoryMeta } from "../categories";
import { isYandexMapsAvailable, loadYandexMaps } from "../yandexMaps";

const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];

// Punchier, more saturated tones for map pins specifically — the rest of the
// UI keeps the muted "utonchённый" palette, but pins on the map read better
// bold and bright against Yandex's own colorful tiles.
const MAP_PIN_COLORS: Record<string, string> = {
  cinema: "#ff5a45",
  theatre: "#9b59d0",
  concert: "#ffb020",
  museum: "#14b8a6",
  exhibition: "#4f8fe8",
  other: "#ff6fa5",
};

function pinColor(category: string): string {
  return MAP_PIN_COLORS[category] ?? MAP_PIN_COLORS.other;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// Events sharing a venue get a small deterministic offset so their pins don't
// stack exactly on top of each other.
function jitter(seed: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = 0.0006 * ((hash % 5) + 1);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function EventMap({
  events,
  onSend,
  onBuy,
  onBought,
}: {
  events: EventDto[];
  onSend: (id: string) => void;
  onBuy: (event: EventDto) => void;
  onBought: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<NonNullable<Window["ymaps"]>["Map"]> | null>(null);
  const eventsRef = useRef<EventDto[]>(events);
  const eventsByIdRef = useRef<Map<string, EventDto>>(new Map());
  eventsRef.current = events;

  function renderPlacemarks() {
    const map = mapRef.current;
    const ymaps = window.ymaps;
    if (!map || !ymaps) return;

    map.geoObjects.removeAll();
    eventsByIdRef.current.clear();

    const withVenue = eventsRef.current.filter(
      (e): e is EventDto & { venue: NonNullable<EventDto["venue"]> } => !!e.venue
    );

    for (const event of withVenue) {
      eventsByIdRef.current.set(event.id, event);
      const color = pinColor(event.category);
      const meta = categoryMeta(event.category);
      const [dLat, dLon] = jitter(event.id);

      const pinHtml = `<div class="map-pin" style="background:${color};box-shadow:0 4px 16px ${color}80"><svg class="map-pin-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${meta.iconInner}</svg></div>`;

      const balloonHtml = `
        <div class="map-popup">
          <p class="map-popup-title" style="color:${color}">${escapeHtml(event.title)}</p>
          <p class="map-popup-meta">${escapeHtml(event.venue.name)} · ${formatDate(event.startsAt)} · ${event.price} ₽</p>
          ${event.description ? `<p class="map-popup-description">${escapeHtml(event.description)}</p>` : ""}
          <div class="map-popup-actions">
            <button class="btn btn-secondary btn-sm" data-action="send" data-event-id="${event.id}">Отправить</button>
            <button class="btn btn-primary btn-sm" data-action="buy" data-event-id="${event.id}">Купить</button>
            <button class="btn btn-secondary btn-sm" data-action="bought" data-event-id="${event.id}">Купил</button>
          </div>
        </div>`;

      const placemark = new ymaps.Placemark(
        [event.venue.lat + dLat, event.venue.lon + dLon],
        { balloonContent: balloonHtml },
        {
          iconLayout: ymaps.templateLayoutFactory.createClass(pinHtml),
          iconShape: { type: "Rectangle", coordinates: [[-17, -34], [17, 0]] },
          iconOffset: [-17, -34],
        }
      );
      map.geoObjects.add(placemark);
    }
  }

  // Create the map once and destroy it on unmount.
  useEffect(() => {
    if (!isYandexMapsAvailable() || !containerRef.current) return;
    let cancelled = false;

    loadYandexMaps().then(() => {
      if (cancelled || !containerRef.current || !window.ymaps) return;
      mapRef.current = new window.ymaps.Map(containerRef.current, {
        center: MOSCOW_CENTER,
        zoom: 11,
        controls: ["zoomControl"],
      });
      renderPlacemarks();
    });

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh pins whenever the filtered event list changes.
  useEffect(() => {
    if (mapRef.current) renderPlacemarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // Delegate clicks on balloon action buttons (raw HTML, not React elements).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
      if (!target) return;
      const id = target.dataset.eventId;
      const event = id ? eventsByIdRef.current.get(id) : undefined;
      if (!event) return;
      if (target.dataset.action === "send") onSend(event.id);
      if (target.dataset.action === "buy") onBuy(event);
      if (target.dataset.action === "bought") onBought(event.id);
    }
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [onSend, onBuy, onBought]);

  if (!isYandexMapsAvailable()) {
    return (
      <div className="map-wrap map-unavailable">
        <p>Карта недоступна: не задан ключ Яндекс.Карт (VITE_YANDEX_MAPS_API_KEY).</p>
      </div>
    );
  }

  return (
    <div className="map-wrap">
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
