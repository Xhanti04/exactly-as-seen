export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (n: number, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return iso(d); };
export const today = () => iso(new Date());
export function fmtDate(s: string) {
  if (!s) return "No date";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export function relTime(s: string) {
  const diff = (Date.now() - new Date(s).getTime()) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}
export const isOverdue = (due: string) => !!due && due < today();
