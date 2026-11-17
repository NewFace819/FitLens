/**
 * Shared date helpers — DATA_CONTRACT.md §2.
 * Dates are local calendar days `YYYY-MM-DD`; times are `HH:mm` 24h;
 * weeks run Monday → Sunday. Everyone uses `weekStartOf`, never their own maths.
 */

export type DateKey = string;
export type TimeOfDay = string;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export const isTime = (value: unknown): value is TimeOfDay => typeof value === 'string' && TIME.test(value);

/** Local calendar day of a Date. */
export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (new Date(key + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

/** Monday of the week containing `key`. */
export function weekStartOf(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key));
}

export function nextMonday(key: DateKey): DateKey {
  return addDays(weekStartOf(key), 7);
}

export const toMinutes = (time: TimeOfDay) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const fromMinutes = (m: number): TimeOfDay => {
  const v = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

/** Local Date for a calendar day + time. */
export function toLocalDate(date: DateKey, time: TimeOfDay): Date {
  return new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), Number(time.slice(0, 2)), Number(time.slice(3, 5)));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "Oct 26" */
export const shortDate = (key: DateKey) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8, 10))}`;
/** "Wed, Oct 28" */
export const dayLabel = (key: DateKey) => `${WEEKDAY_SHORT[weekdayIndex(key)]}, ${shortDate(key)}`;
/** "Oct 26 – Nov 1" */
export const weekLabel = (monday: DateKey) => `${shortDate(monday)} – ${shortDate(addDays(monday, 6))}`;
