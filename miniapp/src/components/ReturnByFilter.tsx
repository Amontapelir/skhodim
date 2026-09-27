import { useState } from "react";
import { getUserLocation } from "../yandexMaps";

export interface ReturnByState {
  enabled: boolean;
  home: [number, number] | null;
  returnByTime: string;
}

export const DEFAULT_RETURN_BY_STATE: ReturnByState = { enabled: false, home: null, returnByTime: "22:00" };

export function ReturnByFilter({
  value,
  onChange,
}: {
  value: ReturnByState;
  onChange: (next: ReturnByState) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function handleToggle() {
    if (value.enabled) {
      onChange({ ...value, enabled: false });
      return;
    }
    if (value.home) {
      onChange({ ...value, enabled: true });
      return;
    }
    setLocating(true);
    setLocationError(null);
    try {
      const home = await getUserLocation();
      onChange({ ...value, enabled: true, home });
    } catch (e) {
      setLocationError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="filters-row return-by-filter">
      <button className={`filter-chip ${value.enabled ? "active" : ""}`} onClick={handleToggle} disabled={locating}>
        {locating ? "Определяем, где вы…" : "Успею и вернусь"}
      </button>

      {value.enabled && (
        <label className="return-by-time">
          домой до
          <input
            type="time"
            value={value.returnByTime}
            onChange={(e) => onChange({ ...value, returnByTime: e.target.value })}
          />
        </label>
      )}

      {locationError && <span className="return-by-error">{locationError}</span>}
      {value.enabled && !locationError && (
        <span className="return-by-note">Оценка приблизительная — по прямой линии и средней скорости, не точный маршрут.</span>
      )}
    </div>
  );
}
