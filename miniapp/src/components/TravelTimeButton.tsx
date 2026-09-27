import { useState } from "react";
import { isYandexMapsAvailable, travelTimeTo, type TravelTime } from "../yandexMaps";

/** Renders nothing when no Yandex Maps API key is configured. */
export function TravelTimeButton({ destination }: { destination: [number, number] }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; result?: TravelTime; error?: string }>({
    status: "idle",
  });

  if (!isYandexMapsAvailable()) return null;

  async function handleClick() {
    setState({ status: "loading" });
    try {
      const result = await travelTimeTo(destination);
      setState({ status: "idle", result });
    } catch (e) {
      setState({ status: "error", error: (e as Error).message });
    }
  }

  if (state.result) {
    return (
      <span className="travel-time-result">
        🚗 {state.result.humanTime}, {state.result.humanLength}
      </span>
    );
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={handleClick} disabled={state.status === "loading"}>
      {state.status === "loading" ? "Считаем…" : state.status === "error" ? "Не вышло, ещё раз?" : "Время в пути"}
    </button>
  );
}
