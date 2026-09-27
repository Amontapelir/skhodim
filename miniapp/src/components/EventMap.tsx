import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { EventDto } from "../api";
import { categoryMeta } from "../categories";

const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];

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

function buildPinIcon(category: string): L.DivIcon {
  const meta = categoryMeta(category);
  return L.divIcon({
    className: "map-pin-wrap",
    html: `
      <div class="map-pin" style="background:${meta.color}">
        <svg class="map-pin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${meta.iconInner}</svg>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
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
  const withVenue = events.filter((e): e is EventDto & { venue: NonNullable<EventDto["venue"]> } => !!e.venue);

  return (
    <div className="map-wrap">
      <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: "100%", width: "100%" }} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {withVenue.map((event) => {
          const meta = categoryMeta(event.category);
          const [dLat, dLon] = jitter(event.id);
          return (
            <Marker key={event.id} position={[event.venue.lat + dLat, event.venue.lon + dLon]} icon={buildPinIcon(event.category)}>
              <Popup>
                <div className="map-popup">
                  <p className="map-popup-title" style={{ color: meta.color }}>
                    {event.title}
                  </p>
                  <p className="map-popup-meta">
                    {event.venue.name} · {formatDate(event.startsAt)} · {event.price} ₽
                  </p>
                  <div className="map-popup-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => onSend(event.id)}>
                      Отправить
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => onBuy(event)}>
                      Купить
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onBought(event.id)}>
                      Купил
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <div className="map-attribution">© OpenStreetMap contributors</div>
    </div>
  );
}
