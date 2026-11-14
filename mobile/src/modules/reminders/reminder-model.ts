/**
 * Reminder — OWNER: Tu. Pure. DATA_CONTRACT §9:
 * { id, sessionId (null = default for the whole schedule), enabled, minutesBefore }.
 * The workout *time* belongs to Hải's Session.time; reminders only add the lead.
 */
import { isDateKey, toLocalDate, type DateKey, type TimeOfDay } from '../../shared/dates.ts';

export const MINUTES_BEFORE = [0, 15, 30] as const;
export type MinutesBefore = (typeof MINUTES_BEFORE)[number];

export type Reminder = {
  id: string;
  sessionId: string | null;
  enabled: boolean;
  minutesBefore: MinutesBefore;
};

export const DEFAULT_REMINDER: Reminder = { id: 'rm-default', sessionId: null, enabled: false, minutesBefore: 15 };

const isLead = (n: unknown): n is MinutesBefore => (MINUTES_BEFORE as readonly unknown[]).includes(n);

export function parseReminders(data: unknown): Reminder[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string | null>();
  const out: Reminder[] = [];
  for (const r of data) {
    if (!r || typeof r.id !== 'string') continue;
    const sessionId = typeof r.sessionId === 'string' ? r.sessionId : null;
    if (seen.has(sessionId)) continue;
    seen.add(sessionId);
    out.push({ id: r.id, sessionId, enabled: r.enabled === true, minutesBefore: isLead(r.minutesBefore) ? r.minutesBefore : 15 });
  }
  return out;
}

/** The session's own reminder, else the schedule default, else DEFAULT_REMINDER. */
export function resolveReminder(list: Reminder[], sessionId: string | null): Reminder {
  return (
    (sessionId !== null ? list.find((r) => r.sessionId === sessionId) : undefined) ??
    list.find((r) => r.sessionId === null) ??
    DEFAULT_REMINDER
  );
}

export function leadLabel(m: MinutesBefore): string {
  return m === 0 ? 'At start' : `${m} min before`;
}

export type PlannedSession = { id: string; date: DateKey; time: TimeOfDay | null; status: string; title: string };
export type ScheduledNotification = { sessionId: string; at: Date; title: string; body: string };

/** Which notifications should exist right now: planned, timed, enabled, still in the future. */
export function notificationPlan(sessions: PlannedSession[], reminders: Reminder[], now: Date): ScheduledNotification[] {
  const out: ScheduledNotification[] = [];
  for (const s of sessions) {
    if (s.status !== 'planned' || !s.time || !isDateKey(s.date)) continue;
    const r = resolveReminder(reminders, s.id);
    if (!r.enabled) continue;
    const at = new Date(toLocalDate(s.date, s.time).getTime() - r.minutesBefore * 60_000);
    if (at.getTime() <= now.getTime()) continue;
    out.push({
      sessionId: s.id,
      at,
      title: r.minutesBefore ? `${s.title} in ${r.minutesBefore} minutes` : `Time for ${s.title.toLowerCase()}`,
      body: 'A little movement goes a long way.',
    });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
