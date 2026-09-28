import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchIncomingInvites, respondToInvite, type InviteListItem } from "../api";
import { categoryMeta } from "../categories";
import { CategoryIcon } from "../components/CategoryIcon";

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
}: {
  invite: InviteListItem;
  onRespond: (status: "going" | "cannot" | "propose_other_date") => void;
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
        {invite.event.description && <p className="card-description">{invite.event.description}</p>}
        <div className="ticket-actions">
          <button className="btn btn-going" onClick={() => onRespond("going")}>
            Иду
          </button>
          <button className="btn btn-cannot" onClick={() => onRespond("cannot")}>
            Не могу
          </button>
          <button className="btn btn-secondary" onClick={() => onRespond("propose_other_date")}>
            Предложить другую дату
          </button>
          <button className="btn btn-secondary" onClick={() => window.open(invite.event.purchaseUrl, "_blank")}>
            Сайт события
          </button>
        </div>
        <div className="status-line">
          {invite.responses.map((r) => `${r.displayName ?? r.userMaxId}: ${STATUS_LABELS[r.status] ?? r.status}`).join(" · ")}
        </div>
      </div>
    </article>
  );
}

export function Invites({ maxUserId }: { maxUserId: string }) {
  const [invites, setInvites] = useState<InviteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function respond(inviteId: string, status: "going" | "cannot" | "propose_other_date") {
    if (status === "propose_other_date") {
      const date = prompt("Предложите дату и время (YYYY-MM-DD HH:MM):");
      if (!date) return;
      await respondToInvite(inviteId, maxUserId, status, new Date(date).toISOString());
    } else {
      await respondToInvite(inviteId, maxUserId, status);
    }
    await reload();
  }

  if (loading) return <div className="empty-state">Загрузка…</div>;
  if (error) return <div className="empty-state">Ошибка загрузки: {error}</div>;
  if (invites.length === 0) return <div className="empty-state">Пока никто не позвал.</div>;

  return (
    <div>
      {invites.map((invite) => (
        <InviteCard key={invite.inviteId} invite={invite} onRespond={(status) => respond(invite.inviteId, status)} />
      ))}
    </div>
  );
}
