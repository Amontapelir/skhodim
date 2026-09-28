import { useState } from "react";
import { getUserLocation } from "../yandexMaps";

export interface RadiusState {
  enabled: boolean;
  center: [number, number] | null;
  radiusKm: number;
}

export const DEFAULT_RADIUS_STATE: RadiusState = { enabled: false, center: null, radiusKm: 10 };

// A plain circle around a point, not a district or metro list — works the same
// in Moscow, Kazan, or any other city, since it only needs the venue's
// coordinates (which every source already provides), not a per-city reference table.
export function RadiusFilter({ value, onChange }: { value: RadiusState; onChange: (next: RadiusState) => void }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function handleToggle() {
    if (value.enabled) {
      onChange({ ...value, enabled: false });
      return;
    }
    if (value.center) {
      onChange({ ...value, enabled: true });
      return;
    }
    setLocating(true);
    setLocationError(null);
    try {
      const center = await getUserLocation();
      onChange({ ...value, enabled: true, center });
    } catch (e) {
      setLocationError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="filters-row radius-filter">
      <button className={`filter-chip ${value.enabled ? "active" : ""}`} onClick={handleToggle} disabled={locating}>
        {locating ? "Определяем, где вы…" : "Рядом со мной"}
      </button>

      {value.enabled && (
        <label className="radius-slider">
          {value.radiusKm} км
          <input
            type="range"
            min={1}
            max={30}
            value={value.radiusKm}
            onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })}
          />
        </label>
      )}

      {locationError && <span className="return-by-error">{locationError}</span>}
    </div>
  );
}
