export interface CategoryMeta {
  label: string;
  color: string;
  /** Inner <svg> markup (paths/lines), viewBox 0 0 24 24, stroke-based. */
  iconInner: string;
}

const FILM_ICON =
  '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/><line x1="3" y1="9" x2="7" y2="9"/><line x1="3" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="21" y2="9"/><line x1="17" y1="15" x2="21" y2="15"/>';

const MASK_ICON =
  '<path d="M12 3c-4 0-7 2.5-7 6 0 2 1 3.5 2 4.5-1 .5-2 1.5-2 3 0 2.5 3 4.5 7 4.5s7-2 7-4.5c0-1.5-1-2.5-2-3 1-1 2-2.5 2-4.5 0-3.5-3-6-7-6Z"/><circle cx="9.3" cy="10" r="0.9" fill="currentColor" stroke="none"/><circle cx="14.7" cy="10" r="0.9" fill="currentColor" stroke="none"/><path d="M9 15c1 1 5 1 6 0"/>';

const MUSIC_ICON = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';

const LANDMARK_ICON =
  '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>';

const FRAME_ICON =
  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>';

const SPARKLE_ICON =
  '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.3 6.3l3.5 3.5M14.2 14.2l3.5 3.5M17.7 6.3l-3.5 3.5M9.8 14.2l-3.5 3.5"/>';

export const CATEGORY_META: Record<string, CategoryMeta> = {
  cinema: { label: "Кино", color: "#b5533c", iconInner: FILM_ICON },
  theatre: { label: "Театр", color: "#6e4b84", iconInner: MASK_ICON },
  concert: { label: "Концерт", color: "#c08a28", iconInner: MUSIC_ICON },
  museum: { label: "Музей", color: "#2f6f63", iconInner: LANDMARK_ICON },
  exhibition: { label: "Выставка", color: "#3b5b7a", iconInner: FRAME_ICON },
  other: { label: "Событие", color: "#7a6a58", iconInner: SPARKLE_ICON },
};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}
