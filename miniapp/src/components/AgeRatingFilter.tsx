const RATING_TIERS = [0, 6, 12, 16, 18];

export function AgeRatingFilter({ value, onChange }: { value: number[]; onChange: (ratings: number[]) => void }) {
  const isAll = value.length === 0;

  function toggle(tier: number) {
    const next = value.includes(tier) ? value.filter((t) => t !== tier) : [...value, tier];
    onChange(next);
  }

  return (
    <div className="filters-row">
      <button className={`filter-chip ${isAll ? "active" : ""}`} onClick={() => onChange([])}>
        Любой ценз
      </button>
      {RATING_TIERS.map((tier) => (
        <button key={tier} className={`filter-chip ${value.includes(tier) ? "active" : ""}`} onClick={() => toggle(tier)}>
          {tier}+
        </button>
      ))}
    </div>
  );
}
