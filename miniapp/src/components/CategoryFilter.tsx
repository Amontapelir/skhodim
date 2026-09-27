import { CATEGORY_META } from "../categories";
import { CategoryIcon } from "./CategoryIcon";

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

export function CategoryFilter({
  selected,
  onChange,
}: {
  /** Empty array means "all categories" (no restriction). */
  selected: string[];
  onChange: (categories: string[]) => void;
}) {
  const isAll = selected.length === 0;

  function toggle(category: string) {
    const next = selected.includes(category) ? selected.filter((c) => c !== category) : [...selected, category];
    onChange(next);
  }

  return (
    <div className="filters-row">
      <button className={`filter-chip ${isAll ? "active" : ""}`} onClick={() => onChange([])}>
        Все
      </button>
      {ALL_CATEGORIES.map((category) => {
        const meta = CATEGORY_META[category];
        const active = selected.includes(category);
        return (
          <button key={category} className={`filter-chip category-chip ${active ? "active" : ""}`} onClick={() => toggle(category)}>
            <CategoryIcon category={category} size={13} color={active ? "#fdf6ec" : meta.color} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
