import { useState } from "react";
import { Feed } from "./screens/Feed";
import { Invites } from "./screens/Invites";
import type { AgeGroup } from "./api";

// Locally-known user for the mini-app dev preview. Real launches read this
// from MAX's signed init data instead of a hardcoded value.
const DEV_MAX_USER_ID = "dev-user-1";
const DEV_PROFILE = { balance: 3500, cinemaLimit: 1200, ageGroup: "16-17" as AgeGroup };

export default function App() {
  const [tab, setTab] = useState<"feed" | "invites">("feed");

  return (
    <div className="app">
      <div className="tabs">
        <button className={`tab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}>
          Подборка
        </button>
        <button className={`tab ${tab === "invites" ? "active" : ""}`} onClick={() => setTab("invites")}>
          Зовут
        </button>
      </div>
      {tab === "feed" ? (
        <Feed maxUserId={DEV_MAX_USER_ID} profile={DEV_PROFILE} />
      ) : (
        <Invites maxUserId={DEV_MAX_USER_ID} />
      )}
      <p className="disclaimer">
        «Сходим?» — независимый неофициальный сервис. Не связан с оператором программы «Пушкинская карта»,
        Минкультуры России или ВТБ. Цены и наличие мест — справочные, финальные данные и билет — у продавца.
      </p>
    </div>
  );
}
