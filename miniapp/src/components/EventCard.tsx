import { useState, type CSSProperties } from "react";
import type { EventDto, EventSession } from "../api";
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

function sessionLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(" г.", "");
}

export function EventCard({
  event,
  onSend,
  onBuy,
  onBought,
}: {
  event: EventDto;
  onSend: (session: EventSession) => void;
  onBuy: (session: EventSession) => void;
  onBought: (session: EventSession) => void;
}) {
  const meta = categoryMeta(event.category);
  const sessions = event.sessions;
  const [selectedId, setSelectedId] = useState<string>(event.id);

  // The card's own top-level fields already are the earliest session — reuse
  // them as the default so a single-session event needs no extra lookup.
  const activeSession: EventSession =
    (sessions ?? []).find((s) => s.id === selectedId) ?? {
      id: event.id,
      startsAt: event.startsAt,
      price: event.price,
      purchaseUrl: event.purchaseUrl,
    };

  const { day, month, time } = ticketDate(activeSession.startsAt);

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
          <span className="ticket-price">{activeSession.price} ₽</span>
        </div>
        <p className="ticket-title">{event.title}</p>
        <p className="ticket-meta">
          {time} · с {event.minAge || 0}+
        </p>
        {event.description && <p className="card-description">{event.description}</p>}

        {sessions && sessions.length > 1 && (
          <div className="session-picker">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`session-chip ${s.id === activeSession.id ? "active" : ""}`}
                onClick={() => setSelectedId(s.id)}
              >
                {sessionLabel(s.startsAt)} · {s.price} ₽
              </button>
            ))}
          </div>
        )}

        <div className="ticket-actions">
          <button className="btn btn-secondary" onClick={() => onSend(activeSession)}>
            Отправить событие
          </button>
          <button className="btn btn-primary" onClick={() => onBuy(activeSession)}>
            Купить
          </button>
          <button className="btn btn-secondary" onClick={() => onBought(activeSession)}>
            Купил
          </button>
          {event.venue && <TravelTimeButton destination={[event.venue.lat, event.venue.lon]} />}
        </div>
        <div className="ticket-footer">
          <span>БИЛЕТ № {activeSession.id.slice(0, 8).toUpperCase()}</span>
          <span className="ticket-mark">Сходим?</span>
        </div>
      </div>
    </article>
  );
}
