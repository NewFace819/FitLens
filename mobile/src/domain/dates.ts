/**
 * Calendar-date helpers. A "date key" is a local calendar day as `YYYY-MM-DD`.
 * Weeks run Monday → Sunday and are identified by their Monday's date key.
 *
 * Date keys are compared as strings (lexical order == chronological order) and
 * shifted with UTC arithmetic so time zones and DST never move a day.
 */

export type DateKey = string;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Local calendar day of a Date (or of an ISO timestamp). */
export function toDateKey(input: Date | string): DateKey {
  const d = typeof input === 'string' ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  const sundayFirst = new Date(key + 'T00:00:00Z').getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** Monday of the week containing `key`. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key));
}

export function nextMonday(key: DateKey): DateKey {
  return addDays(weekStart(key), 7);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "Oct 26" */
export function shortDate(key: DateKey): string {
  return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8, 10))}`;
}

/** "Oct 26 – Nov 1" for the week starting at `monday`. */
export function weekLabel(monday: DateKey): string {
  return `${shortDate(monday)} – ${shortDate(addDays(monday, 6))}`;
}
