import { useState } from "react";
import { getUserLocation } from "../yandexMaps";
import { estimateTravelMinutes, formatTravelMinutes } from "../travelEstimate";

/** Approximate one-way travel time from the user's location — straight-line distance
 * and an assumed speed, not a real route (see travelEstimate.ts for why). */
export function TravelTimeButton({ destination }: { destination: [number, number] }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; result?: string; error?: string }>({
    status: "idle",
  });

  async function handleClick() {
    setState({ status: "loading" });
    try {
      const origin = await getUserLocation();
      const minutes = estimateTravelMinutes(origin, destination);
      setState({ status: "idle", result: formatTravelMinutes(minutes) });
    } catch (e) {
      setState({ status: "error", error: (e as Error).message });
    }
  }

  if (state.result) {
    return <span className="travel-time-result">🚗 {state.result} (приблизительно)</span>;
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={handleClick} disabled={state.status === "loading"}>
      {state.status === "loading" ? "Считаем…" : state.status === "error" ? "Не вышло, ещё раз?" : "Время в пути"}
    </button>
  );
}
