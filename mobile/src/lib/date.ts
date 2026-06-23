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

const DAY_NAMES = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MONTH_NAMES = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Etichetta amichevole per il selettore giorno: "Oggi" / "Ieri" / "mer 23 giu". */
export function formatDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Oggi";
  if (iso === shiftISO(today, -1)) return "Ieri";
  if (iso === shiftISO(today, 1)) return "Domani";
  const d = new Date(iso + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
