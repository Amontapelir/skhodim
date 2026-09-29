import { useCallback, useEffect, useState } from "react";
import { Feed } from "./screens/Feed";
import { Invites } from "./screens/Invites";
import { fetchIncomingInvites, fetchProfile, type ProfileDto } from "./api";

// Locally-known user for the mini-app dev preview. Real launches read this
// from MAX's signed init data instead of a hardcoded value.
const DEV_MAX_USER_ID = "dev-user-1";

// How often to re-check for new invites while the user sits on the "Подборка"
// tab — cheap enough (one small JSON response) to poll rather than requiring
// a manual refresh to notice a friend just invited you.
const PENDING_INVITES_POLL_MS = 30_000;

export default function App() {
  const [tab, setTab] = useState<"feed" | "invites">("feed");
  const [pendingCount, setPendingCount] = useState(0);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // The real, persisted balance — not a hardcoded guess. Fetching it fresh
  // (rather than hardcoding it once) matters because "Купил" mutates it on
  // the server: a stale local copy would keep showing/offering events the
  // real stored balance can no longer afford, and "Купил" would start
  // failing with 400 for reasons invisible from the UI.
  const refreshProfile = useCallback(() => {
    fetchProfile(DEV_MAX_USER_ID)
      .then(setProfile)
      .catch((e) => setProfileError(String(e)));
  }, []);

  const refreshPendingCount = useCallback(() => {
    fetchIncomingInvites(DEV_MAX_USER_ID)
      .then((invites) => setPendingCount(invites.filter((i) => i.myStatus === "pending").length))
      .catch(() => {
        // Silent — a failed badge refresh shouldn't surface as an app-wide error.
      });
  }, []);

  useEffect(() => {
    refreshProfile();
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, PENDING_INVITES_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshProfile, refreshPendingCount]);

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
      {tab === "feed" &&
        (profile ? (
          <Feed
            maxUserId={DEV_MAX_USER_ID}
            profile={{ balance: profile.balance, cinemaLimit: profile.cinemaLimit, ageGroup: profile.ageGroup ?? "16-17" }}
            onProfileChanged={refreshProfile}
          />
        ) : (
          <div className="empty-state">{profileError ? `Ошибка загрузки профиля: ${profileError}` : "Загрузка профиля…"}</div>
        ))}
      {tab === "invites" && <Invites maxUserId={DEV_MAX_USER_ID} onInvitesChanged={refreshPendingCount} />}
      <p className="disclaimer">
        «Сходим?» — независимый неофициальный сервис. Не связан с оператором программы «Пушкинская карта»,
        Минкультуры России или ВТБ. Цены и наличие мест — справочные, финальные данные и билет — у продавца.
      </p>
    </div>
  );
}
