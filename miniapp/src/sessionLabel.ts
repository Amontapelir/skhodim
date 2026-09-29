export function sessionLabel(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .replace(" г.", "");
}
