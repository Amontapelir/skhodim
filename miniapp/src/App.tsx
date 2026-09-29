import { useCallback, useEffect, useState } from "react";
import { Feed } from "./screens/Feed";
import { Invites } from "./screens/Invites";
import { fetchIncomingInvites, type AgeGroup } from "./api";

// Locally-known user for the mini-app dev preview. Real launches read this
// from MAX's signed init data instead of a hardcoded value.
const DEV_MAX_USER_ID = "dev-user-1";
const DEV_PROFILE = { balance: 3500, cinemaLimit: 1200, ageGroup: "16-17" as AgeGroup };

// How often to re-check for new invites while the user sits on the "Подборка"
// tab — cheap enough (one small JSON response) to poll rather than requiring
// a manual refresh to notice a friend just invited you.
const PENDING_INVITES_POLL_MS = 30_000;

export default function App() {
  const [tab, setTab] = useState<"feed" | "invites">("feed");
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(() => {
    fetchIncomingInvites(DEV_MAX_USER_ID)
      .then((invites) => setPendingCount(invites.filter((i) => i.myStatus === "pending").length))
      .catch(() => {
        // Silent — a failed badge refresh shouldn't surface as an app-wide error.
      });
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, PENDING_INVITES_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return (
    <div className="app">
      <div className="tabs">
        <button className={`tab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}>
          Подборка
        </button>
        <button className={`tab ${tab === "invites" ? "active" : ""}`} onClick={() => setTab("invites")}>
          Зовут
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </button>
      </div>
      {tab === "feed" ? (
        <Feed maxUserId={DEV_MAX_USER_ID} profile={DEV_PROFILE} />
      ) : (
        <Invites maxUserId={DEV_MAX_USER_ID} onInvitesChanged={refreshPendingCount} />
      )}
      <p className="disclaimer">
        «Сходим?» — независимый неофициальный сервис. Не связан с оператором программы «Пушкинская карта»,
        Минкультуры России или ВТБ. Цены и наличие мест — справочные, финальные данные и билет — у продавца.
      </p>
    </div>
  );
}
