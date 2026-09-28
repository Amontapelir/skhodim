import type { CSSProperties } from "react";
import type { EventDto } from "../api";
import { categoryMeta } from "../categories";
import { CategoryIcon } from "./CategoryIcon";
import { TravelTimeButton } from "./TravelTimeButton";

function ticketDate(iso: string): { day: string; month: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleString("ru-RU", { day: "numeric" }),
    month: d.toLocaleString("ru-RU", { month: "short" }).replace(".", ""),
    time: d.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  };
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
  const { day, month, time } = ticketDate(event.startsAt);

  return (
    <article className="ticket" style={{ "--cat": meta.color } as CSSProperties}>
      <div className="ticket-stub">
        <div className="ticket-stamp">
          <CategoryIcon category={event.category} size={17} color="currentColor" />
        </div>
        <div className="ticket-stub-label">{meta.label}</div>
        <div className="ticket-stub-date">
          <span className="ticket-day">{day}</span>
          <span className="ticket-month">{month}</span>
        </div>
      </div>
      <div className="ticket-body">
        <div className="ticket-top">
          {event.venue && <span className="ticket-venue">{event.venue.name}</span>}
          <span className="ticket-price">{event.price} ₽</span>
        </div>
        <p className="ticket-title">{event.title}</p>
        <p className="ticket-meta">
          {time} · с {event.minAge || 0}+
        </p>
        {event.description && <p className="card-description">{event.description}</p>}
        <div className="ticket-actions">
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
        <div className="ticket-footer">
          <span>БИЛЕТ № {event.id.slice(0, 8).toUpperCase()}</span>
          <span className="ticket-mark">Сходим?</span>
        </div>
      </div>
    </article>
  );
}
