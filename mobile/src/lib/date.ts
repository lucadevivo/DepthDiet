/** Data odierna in formato 'YYYY-MM-DD' (ora locale). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Sposta una data 'YYYY-MM-DD' di N giorni (può essere negativo). */
export function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Friendly label for the day selector: "Today" / "Yesterday" / "Wed 23 Jun". */
export function formatDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === shiftISO(today, -1)) return "Yesterday";
  if (iso === shiftISO(today, 1)) return "Tomorrow";
  const d = new Date(iso + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
