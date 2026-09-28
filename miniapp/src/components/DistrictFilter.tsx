import { MOSCOW_DISTRICTS } from "../districts";

export function DistrictFilter({
  selected,
  onChange,
}: {
  /** Empty array means "all districts" (no restriction). */
  selected: string[];
  onChange: (districts: string[]) => void;
}) {
  const isAll = selected.length === 0;

  function toggle(district: string) {
    const next = selected.includes(district) ? selected.filter((d) => d !== district) : [...selected, district];
    onChange(next);
  }

  return (
    <div className="filters-row">
      <button className={`filter-chip ${isAll ? "active" : ""}`} onClick={() => onChange([])}>
        Везде
      </button>
      {MOSCOW_DISTRICTS.map((district) => {
        const active = selected.includes(district);
        return (
          <button key={district} className={`filter-chip ${active ? "active" : ""}`} onClick={() => toggle(district)}>
            {district}
          </button>
        );
      })}
    </div>
  );
}
