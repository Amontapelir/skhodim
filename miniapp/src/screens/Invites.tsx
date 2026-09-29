import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  fetchEventSessions,
  fetchIncomingInvites,
  respondToInvite,
  type EventDto,
  type EventSession,
  type InviteListItem,
} from "../api";
import { categoryMeta } from "../categories";
import { sessionLabel } from "../sessionLabel";
import { CategoryIcon } from "../components/CategoryIcon";
import { EventMap } from "../components/EventMap";
import { TravelTimeButton } from "../components/TravelTimeButton";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает ответа",
  going: "Идёт",
  cannot: "Не может",
  propose_other_date: "Предлагает другую дату",
};

function ticketDate(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleString("ru-RU", { day: "numeric" }),
    month: d.toLocaleString("ru-RU", { month: "short" }).replace(".", ""),
  };
}

function InviteCard({
  invite,
  onRespond,
  onProposeOtherDate,
}: {
  invite: InviteListItem;
  onRespond: (status: "going" | "cannot") => void;
  onProposeOtherDate: () => void;
}) {
  const meta = categoryMeta(invite.event.category);
  const { day, month } = ticketDate(invite.event.startsAt);

  return (
    <article className="ticket" style={{ "--cat": meta.color } as CSSProperties}>
      <div className="ticket-stub">
        <div className="ticket-stamp">
          <CategoryIcon category={invite.event.category} size={17} color="currentColor" />
        </div>
        <div className="ticket-stub-label">{meta.label}</div>
        <div className="ticket-stub-date">
          <span className="ticket-day">{day}</span>
          <span className="ticket-month">{month}</span>
        </div>
      </div>
      <div className="ticket-body">
        <div className="ticket-top">
          {invite.event.venue && <span className="ticket-venue">{invite.event.venue.name}</span>}
          <span className={`affordability-tag ${invite.fitsBalance ? "fits" : "overbudget"}`}>
            {invite.fitsBalance ? "влезает в остаток" : `не хватает ${invite.shortfall} ₽`}
          </span>
        </div>
        <p className="ticket-title">{invite.event.title}</p>
        <p className="ticket-meta">
          {new Date(invite.event.startsAt).toLocaleString("ru-RU")} · {invite.event.price} ₽
        </p>
        {invite.fromDisplayName && <p className="invite-from">Зовёт: {invite.fromDisplayName}</p>}
        {invite.comment && <p className="invite-comment">«{invite.comment}»</p>}
        {invite.event.description && <p className="card-description">{invite.event.description}</p>}
        <div className="ticket-actions">
          <button className="btn btn-going" onClick={() => onRespond("going")}>
            Иду
          </button>
          <button className="btn btn-cannot" onClick={() => onRespond("cannot")}>
            Не могу
          </button>
          <button className="btn btn-secondary" onClick={onProposeOtherDate}>
            Предложить другое время
          </button>
          <button className="btn btn-secondary" onClick={() => window.open(invite.event.purchaseUrl, "_blank")}>
            Сайт события
          </button>
          {invite.event.venue && <TravelTimeButton destination={[invite.event.venue.lat, invite.event.venue.lon]} />}
        </div>
        <div className="status-line">
          {invite.responses.map((r) => `${r.displayName ?? r.userMaxId}: ${STATUS_LABELS[r.status] ?? r.status}`).join(" · ")}
        </div>
      </div>
    </article>
  );
}

function ProposeOtherTimeModal({
  invite,
  onClose,
  onProposed,
}: {
  invite: InviteListItem;
  onClose: () => void;
  onProposed: (startsAt: string) => void;
}) {
  const [sessions, setSessions] = useState<EventSession[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventSessions(invite.event.id)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [invite.event.id]);

  // The event itself is always among its own sessions — offer only the others.
  const otherSessions = (sessions ?? []).filter((s) => s.id !== invite.event.id);

  function proposeManually() {
    const date = prompt("Предложите дату и время (YYYY-MM-DD HH:MM):");
    if (!date) return;
    onProposed(new Date(date).toISOString());
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">Другое время для «{invite.event.title}»?</p>

        {loading && <div className="empty-state">Загрузка сеансов…</div>}
        {!loading && otherSessions.length > 0 && (
          <div className="session-picker">
            {otherSessions.map((s) => (
              <button key={s.id} type="button" className="session-chip" onClick={() => onProposed(s.startsAt)}>
                {sessionLabel(s.startsAt)} · {s.price} ₽
              </button>
            ))}
          </div>
        )}
        {!loading && otherSessions.length === 0 && (
          <div className="empty-state">Других известных сеансов этого события не нашлось.</div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={proposeManually}>
            Указать вручную
          </button>
        </div>
      </div>
    </div>
  );
}

function InvitesMap({
  invites,
  onRespond,
}: {
  invites: InviteListItem[];
  onRespond: (inviteId: string, status: "going" | "cannot") => void;
}) {
  // Two invites can point at the same event (two friends called you to the
  // same thing) — the map collapses them into one pin, so route an action to
  // whichever invite got there first.
  const inviteByEventId = useMemo(() => new Map(invites.map((i) => [i.event.id, i])), [invites]);
  // Memoized so EventMap's placemark-rebuild effect only fires when the
  // invite list itself changes, not on every incidental re-render — a fresh
  // array/function identity each render was making Yandex rebuild every
  // placemark constantly, and its custom icon/balloon layouts don't get
  // fully cleaned up by removeAll() on rapid rebuilds, silently piling up
  // stale, unclickable pins.
  const events = useMemo(() => invites.map((i) => i.event), [invites]);

  const renderActions = useCallback(
    (event: EventDto) => {
      const invite = inviteByEventId.get(event.id);
      return `
        <button class="btn btn-going btn-sm" data-action="going">Иду</button>
        <button class="btn btn-cannot btn-sm" data-action="cannot">Не могу</button>
        <button class="btn btn-secondary btn-sm" data-action="site">Сайт события</button>
        ${invite && !invite.fitsBalance ? `<span class="return-by-error">не хватает ${invite.shortfall} ₽</span>` : ""}
      `;
    },
    [inviteByEventId]
  );

  const onAction = useCallback(
    (eventId: string, action: string) => {
      const invite = inviteByEventId.get(eventId);
      if (!invite) return;
      if (action === "going") onRespond(invite.inviteId, "going");
      if (action === "cannot") onRespond(invite.inviteId, "cannot");
      if (action === "site") window.open(invite.event.purchaseUrl, "_blank");
    },
    [inviteByEventId, onRespond]
  );

  return <EventMap events={events} renderActions={renderActions} onAction={onAction} />;
}

export function Invites({ maxUserId }: { maxUserId: string }) {
  const [invites, setInvites] = useState<InviteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [proposingInvite, setProposingInvite] = useState<InviteListItem | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIncomingInvites(maxUserId);
      setInvites(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [maxUserId]);

  async function respond(inviteId: string, status: "going" | "cannot") {
    await respondToInvite(inviteId, maxUserId, status);
    await reload();
  }

  async function proposeOtherDate(startsAt: string) {
    if (!proposingInvite) return;
    await respondToInvite(proposingInvite.inviteId, maxUserId, "propose_other_date", startsAt);
    setProposingInvite(null);
    await reload();
  }

  if (loading) return <div className="empty-state">Загрузка…</div>;
  if (error) return <div className="empty-state">Ошибка загрузки: {error}</div>;
  if (invites.length === 0) return <div className="empty-state">Пока никто не позвал.</div>;

  return (
    <div>
      <div className="filters-bar">
        <div className="view-switch">
          <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            Список
          </button>
          <button className={`view-btn ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>
            Карта
          </button>
        </div>
      </div>

      {view === "map" ? (
        <InvitesMap invites={invites} onRespond={respond} />
      ) : (
        invites.map((invite) => (
          <InviteCard
            key={invite.inviteId}
            invite={invite}
            onRespond={(status) => respond(invite.inviteId, status)}
            onProposeOtherDate={() => setProposingInvite(invite)}
          />
        ))
      )}

      {proposingInvite && (
        <ProposeOtherTimeModal
          invite={proposingInvite}
          onClose={() => setProposingInvite(null)}
          onProposed={proposeOtherDate}
        />
      )}
    </div>
  );
}
