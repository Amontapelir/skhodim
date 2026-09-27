import type { EventDto } from "../api";
import { categoryMeta } from "../categories";
import { CategoryIcon } from "./CategoryIcon";
import { TravelTimeButton } from "./TravelTimeButton";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function EventCard({
  event,
  onSend,
  onBuy,
  onBought,
}: {
  event: EventDto;
  onSend: () => void;
  onBuy: () => void;
  onBought: () => void;
}) {
  const meta = categoryMeta(event.category);

  return (
    <div className="card">
      <div className="card-top">
        <span className="category-badge" style={{ background: `${meta.color}17`, color: meta.color }}>
          <CategoryIcon category={event.category} size={13} /> {meta.label}
        </span>
        <span className="card-price">{event.price} ₽</span>
      </div>
      <p className="card-title">{event.title}</p>
      {event.venue && <p className="card-venue">{event.venue.name}</p>}
      <p className="card-meta">
        {formatDate(event.startsAt)} · с {event.minAge || 0}+
      </p>
      <div className="card-actions">
        <button className="btn btn-secondary" onClick={onSend}>
          Отправить
        </button>
        <button className="btn btn-primary" onClick={onBuy}>
          Купить
        </button>
        <button className="btn btn-secondary" onClick={onBought}>
          Купил
        </button>
        {event.venue && <TravelTimeButton destination={[event.venue.lat, event.venue.lon]} />}
      </div>
    </div>
  );
}
