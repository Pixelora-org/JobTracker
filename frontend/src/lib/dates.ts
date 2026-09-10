/** Calendar dates from `<input type="date">` (YYYY-MM-DD), no UTC shift. */

export function toDateInput(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayInput() {
  return toDateInput(new Date());
}

export function addDaysInput(yyyyMmDd: string, days: number) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return toDateInput(new Date(y, m - 1, d + days));
}

/** Store a date-picker value as midday local so the calendar day survives ISO. */
export function dateInputToIso(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}
