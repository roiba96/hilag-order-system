// Sale days are plain "YYYY-MM-DD" dates (sale_days.day). Read them as calendar dates in UTC
// so the weekday never shifts with the device's timezone.

export const HEBREW_WEEKDAYS = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
] as const;

function parseDay(day: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error(`Not a YYYY-MM-DD date: ${day}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** "2026-12-07" → "יום שני". */
export function hebrewWeekday(day: string): string {
  return HEBREW_WEEKDAYS[parseDay(day).getUTCDay()];
}

/** "2026-12-07" → "7.12". */
export function shortDate(day: string): string {
  const d = parseDay(day);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}`;
}

/**
 * Today's date in the business timezone (Asia/Jerusalem) as "YYYY-MM-DD".
 * Server code must call this after a request-time API (e.g. requireUser) so the clock is read
 * per request, not while prerendering.
 */
export function todayInJerusalem(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "2026-12-07" → "יום שני 7.12". */
export function dayText(day: string): string {
  return `${hebrewWeekday(day)} ${shortDate(day)}`;
}

/** Is `day` the calendar day right after `today`? Both "YYYY-MM-DD". */
export function isTomorrow(today: string, day: string): boolean {
  const next = parseDay(today);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}` === day;
}
