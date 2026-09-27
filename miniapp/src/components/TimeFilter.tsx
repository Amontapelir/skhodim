import { useState } from "react";

export interface TimeRange {
  afterHour?: number;
  beforeHour?: number;
}

const PRESETS: Array<{ label: string; range: TimeRange }> = [
  { label: "Весь день", range: {} },
  { label: "Утро", range: { afterHour: 6, beforeHour: 12 } },
  { label: "День", range: { afterHour: 12, beforeHour: 18 } },
  { label: "Вечер", range: { afterHour: 18 } },
];

const HOURS = Array.from({ length: 25 }, (_, i) => i);

function sameRange(a: TimeRange, b: TimeRange): boolean {
  return a.afterHour === b.afterHour && a.beforeHour === b.beforeHour;
}

function formatHour(h: number): string {
  return `${String(h % 24).padStart(2, "0")}:00`;
}

export function TimeFilter({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  const [customOpen, setCustomOpen] = useState(false);
  const matchedPreset = PRESETS.find((p) => sameRange(p.range, value));

  return (
    <div className="time-filter">
      <div className="time-filter-chips">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={`filter-chip ${matchedPreset?.label === preset.label && !customOpen ? "active" : ""}`}
            onClick={() => {
              setCustomOpen(false);
              onChange(preset.range);
            }}
          >
            {preset.label}
          </button>
        ))}
        <button className={`filter-chip ${customOpen ? "active" : ""}`} onClick={() => setCustomOpen((v) => !v)}>
          Своё время
        </button>
      </div>

      {customOpen && (
        <div className="time-filter-custom">
          <label>
            с
            <select
              value={value.afterHour ?? ""}
              onChange={(e) => onChange({ ...value, afterHour: e.target.value === "" ? undefined : Number(e.target.value) })}
            >
              <option value="">—</option>
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </label>
          <label>
            до
            <select
              value={value.beforeHour ?? ""}
              onChange={(e) => onChange({ ...value, beforeHour: e.target.value === "" ? undefined : Number(e.target.value) })}
            >
              <option value="">—</option>
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
