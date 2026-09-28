import { useEffect, useRef } from "react";
import type { EventDto } from "../api";
import { categoryMeta } from "../categories";
import { getUserLocation, isYandexMapsAvailable, loadYandexMaps } from "../yandexMaps";
import { estimateTravelMinutes, formatTravelMinutes } from "../travelEstimate";

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

function ticketDate(iso: string): { day: string; month: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleString("ru-RU", { day: "numeric" }),
    month: d.toLocaleString("ru-RU", { month: "short" }).replace(".", ""),
    time: d.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
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

/** Same ticket look as EventCard/InviteCard, hand-written as an HTML string
 * because Yandex balloon layouts render raw HTML, not React. A custom
 * balloonContentLayout (rather than the default balloonContent string) means
 * we own sizing outright instead of fighting Yandex's own auto-measured
 * balloon width — that mismatch was clipping long descriptions mid-word. */
function ticketBalloonHtml(event: EventDto, actionsHtml: string): string {
  const meta = categoryMeta(event.category);
  const { day, month, time } = ticketDate(event.startsAt);
  return `
    <article class="ticket ticket-balloon" data-event-id="${event.id}" style="--cat:${meta.color}">
      <div class="ticket-stub">
        <div class="ticket-stamp"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${meta.iconInner}</svg></div>
        <div class="ticket-stub-label">${escapeHtml(meta.label)}</div>
        <div class="ticket-stub-date"><span class="ticket-day">${day}</span><span class="ticket-month">${month}</span></div>
      </div>
      <div class="ticket-body">
        <div class="ticket-top">
          ${event.venue ? `<span class="ticket-venue">${escapeHtml(event.venue.name)}</span>` : "<span></span>"}
          <span class="ticket-price">${event.price} ₽</span>
        </div>
        <p class="ticket-title">${escapeHtml(event.title)}</p>
        <p class="ticket-meta">${time} · с ${event.minAge || 0}+</p>
        ${event.description ? `<p class="card-description">${escapeHtml(event.description)}</p>` : ""}
        <div class="ticket-actions">${actionsHtml}${event.venue ? `<button class="btn btn-secondary btn-sm" data-action="traveltime">Время в пути</button>` : ""}</div>
        <div class="ticket-footer">
          <span>БИЛЕТ № ${event.id.slice(0, 8).toUpperCase()}</span>
          <span class="ticket-mark">Сходим?</span>
        </div>
      </div>
    </article>`;
}

export function EventMap({
  events,
  userLocation = null,
  radiusCircle = null,
  renderActions,
  onAction,
}: {
  events: EventDto[];
  userLocation?: [number, number] | null;
  radiusCircle?: { center: [number, number]; radiusKm: number } | null;
  /** HTML for the balloon's action buttons — give each a data-action attribute. */
  renderActions: (event: EventDto) => string;
  onAction: (eventId: string, action: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<NonNullable<Window["ymaps"]>["Map"]> | null>(null);
  const eventsRef = useRef<EventDto[]>(events);
  const eventsByIdRef = useRef<Map<string, EventDto>>(new Map());
  const userLocationRef = useRef<[number, number] | null>(userLocation);
  const radiusCircleRef = useRef(radiusCircle);
  const renderActionsRef = useRef(renderActions);
  eventsRef.current = events;
  userLocationRef.current = userLocation;
  radiusCircleRef.current = radiusCircle;
  renderActionsRef.current = renderActions;

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
      const balloonHtml = ticketBalloonHtml(event, renderActionsRef.current(event));

      const placemark = new ymaps.Placemark(
        [event.venue.lat + dLat, event.venue.lon + dLon],
        {},
        {
          iconLayout: ymaps.templateLayoutFactory.createClass(pinHtml),
          // Padded well beyond the 34x34 visual pin — a forgiving tap target
          // matters more on a real touchscreen than in mouse testing.
          iconShape: { type: "Rectangle", coordinates: [[-30, -46], [30, 14]] },
          iconOffset: [-17, -34],
          // A custom layout (not balloonContent) means Yandex sizes the balloon
          // from our own rendered DOM instead of a mismatched internal default.
          balloonContentLayout: ymaps.templateLayoutFactory.createClass(balloonHtml),
        }
      );
      // Belt-and-suspenders: open the balloon explicitly on click instead of
      // relying only on Yandex's implicit default-click behavior, which was
      // unreliable in testing for reasons that didn't reduce to a clear cause.
      placemark.events.add("click", () => {
        placemark.balloon.open();
      });
      map.geoObjects.add(placemark);
    }

    if (radiusCircleRef.current) {
      const circle = new ymaps.Circle(
        [radiusCircleRef.current.center, radiusCircleRef.current.radiusKm * 1000],
        {},
        { fillColor: "#2f6fed22", strokeColor: "#2f6fedaa", strokeWidth: 2, zIndex: 100 }
      );
      map.geoObjects.add(circle);
    }

    if (userLocationRef.current) {
      const userMarker = new ymaps.Placemark(userLocationRef.current, {}, {
        iconLayout: ymaps.templateLayoutFactory.createClass('<div class="user-location-marker"></div>'),
        iconShape: { type: "Circle", coordinates: [0, 0], radius: 8 },
        iconOffset: [-8, -8],
        zIndex: 1000,
      });
      map.geoObjects.add(userMarker);
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

  // Refresh pins whenever the filtered event list, user location, or radius changes.
  useEffect(() => {
    if (mapRef.current) renderPlacemarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, userLocation, radiusCircle]);

  // Delegate clicks on balloon action buttons (raw HTML, not React elements).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    async function handleTravelTime(button: HTMLButtonElement, event: EventDto) {
      if (!event.venue) return;
      button.textContent = "Считаем…";
      button.disabled = true;
      try {
        const origin = await getUserLocation();
        const minutes = estimateTravelMinutes(origin, [event.venue.lat, event.venue.lon]);
        button.textContent = `🚗 ${formatTravelMinutes(minutes)}`;
      } catch {
        button.textContent = "Не вышло, ещё раз?";
        button.disabled = false;
      }
    }
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
      if (!target?.dataset.action) return;
      const eventId = target.closest<HTMLElement>("[data-event-id]")?.dataset.eventId;
      const event = eventId ? eventsByIdRef.current.get(eventId) : undefined;
      if (!event) return;
      if (target.dataset.action === "traveltime") {
        handleTravelTime(target as HTMLButtonElement, event);
        return;
      }
      onAction(event.id, target.dataset.action);
    }
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [onAction]);

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
