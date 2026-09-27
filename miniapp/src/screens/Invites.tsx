import { useEffect, useState } from "react";
import { fetchIncomingInvites, respondToInvite, type InviteListItem } from "../api";
import { categoryMeta } from "../categories";
import { CategoryIcon } from "../components/CategoryIcon";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает ответа",
  going: "Идёт",
  cannot: "Не может",
  propose_other_date: "Предлагает другую дату",
};

function InviteCard({
  invite,
  onRespond,
}: {
  invite: InviteListItem;
  onRespond: (status: "going" | "cannot" | "propose_other_date") => void;
}) {
  const meta = categoryMeta(invite.event.category);

  return (
    <div className="card">
      <div className="card-top">
        <span className="category-badge" style={{ background: `${meta.color}17`, color: meta.color }}>
          <CategoryIcon category={invite.event.category} size={13} /> {meta.label}
        </span>
        <span className={`affordability-tag ${invite.fitsBalance ? "fits" : "overbudget"}`}>
          {invite.fitsBalance ? "влезает в остаток" : `не хватает ${invite.shortfall} ₽`}
        </span>
      </div>
      <p className="card-title">{invite.event.title}</p>
      {invite.event.venue && <p className="card-venue">{invite.event.venue.name}</p>}
      <p className="card-meta">
        {new Date(invite.event.startsAt).toLocaleString("ru-RU")} · {invite.event.price} ₽
      </p>
      <div className="card-actions">
        <button className="btn btn-going" onClick={() => onRespond("going")}>
          Иду
        </button>
        <button className="btn btn-cannot" onClick={() => onRespond("cannot")}>
          Не могу
        </button>
        <button className="btn btn-secondary" onClick={() => onRespond("propose_other_date")}>
          Предложить другую дату
        </button>
      </div>
      <div className="status-line">
        {invite.responses.map((r) => `${r.displayName ?? r.userMaxId}: ${STATUS_LABELS[r.status] ?? r.status}`).join(" · ")}
      </div>
    </div>
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
