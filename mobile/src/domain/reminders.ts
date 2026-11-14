/**
 * Reminder model: at most one workout time per weekday, with an optional
 * heads-up 15 or 30 minutes before. Ported from prototype/reminder-model.js.
 * Index 0 = Monday … 6 = Sunday.
 */

export const LEAD_OPTIONS = [0, 15, 30] as const;
export type LeadMinutes = (typeof LEAD_OPTIONS)[number];

export type DayReminder = {
  /** "HH:MM", 24h. */
  time: string;
  enabled: boolean;
  /** Minutes before `time` to notify. 0 = at start. */
  before: LeadMinutes;
};

/** Seven slots, Monday first. `null` = no workout time that day. */
export type WeekReminders = (DayReminder | null)[];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTime = (v: unknown): v is string => typeof v === 'string' && TIME.test(v);

export function normalizeReminders(raw: unknown): WeekReminders {
  return Array.from({ length: 7 }, (_, i) => {
    const item = Array.isArray(raw) ? (raw[i] as Partial<DayReminder> | null) : null;
    if (!item || !isValidTime(item.time)) return null;
    return {
      time: item.time,
      enabled: item.enabled === true,
      before: (LEAD_OPTIONS as readonly number[]).includes(item.before as number) ? (item.before as LeadMinutes) : 0,
    };
  });
}

export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const fromMinutes = (m: number) => {
  const v = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

/**
 * When the notification fires: may move to the previous day when the lead
 * crosses midnight (e.g. Tue 00:10 with 15 min before → Mon 23:55).
 */
export function notificationTime(day: number, item: DayReminder): { day: number; hour: number; minute: number } {
  const minutes = toMinutes(item.time) - item.before;
  const shiftedDay = (day + (minutes < 0 ? -1 : 0) + 7) % 7;
  const wrapped = (minutes + 1440) % 1440;
  return { day: shiftedDay, hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
}

/** Expo weekly triggers count 1 = Sunday … 7 = Saturday. */
export const toExpoWeekday = (mondayFirstDay: number) => ((mondayFirstDay + 1) % 7) + 1;

export function leadLabel(before: LeadMinutes): string {
  return before === 0 ? 'At start' : `${before} min before`;
}

/** Ten-minute steps from 05:00 used by the time picker. */
export function stepTime(time: string, deltaMinutes: number): string {
  return fromMinutes(toMinutes(time) + deltaMinutes);
}
