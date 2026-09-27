import { categoryMeta } from "../categories";

export function CategoryIcon({ category, size = 15, color }: { category: string; size?: number; color?: string }) {
  const meta = categoryMeta(category);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? meta.color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: meta.iconInner }}
    />
  );
}
