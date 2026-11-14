/**
 * Reminder public API — OWNER: Tu. Contract (DATA_CONTRACT §6):
 *   getReminder(sessionId) → Reminder | null   (falls back to the schedule default)
 *   setReminder(sessionId, {enabled, minutesBefore}) → Reminder
 * Sync, no React Native imports. Device notifications live in notifications.ts.
 */
import { addDays, toDateKey, weekStartOf } from '../../shared/dates.ts';
import { newId } from '../../shared/ids.ts';
import { KEYS, read, write } from '../../shared/storage.ts';
import { getWeekSchedule, getWorkout } from '../workouts/schedule.ts';
import {
  MINUTES_BEFORE, notificationPlan, parseReminders, resolveReminder,
  type MinutesBefore, type PlannedSession, type Reminder, type ScheduledNotification,
} from './reminder-model.ts';

const load = () => read(KEYS.reminders, [] as Reminder[], { parse: parseReminders });

export function getReminder(sessionId: string | null): Reminder | null {
  return resolveReminder(load(), sessionId);
}

/** True when the session has its own reminder instead of the default. */
export function hasOwnReminder(sessionId: string): boolean {
  return load().some((r) => r.sessionId === sessionId);
}

export function setReminder(sessionId: string | null, patch: { enabled: boolean; minutesBefore: MinutesBefore }): Reminder {
  const list = load();
  const existing = list.find((r) => r.sessionId === sessionId);
  const next: Reminder = {
    id: existing?.id ?? (sessionId === null ? 'rm-default' : newId('rm')),
    sessionId,
    enabled: patch.enabled === true,
    minutesBefore: (MINUTES_BEFORE as readonly number[]).includes(patch.minutesBefore) ? patch.minutesBefore : 15,
  };
  write(KEYS.reminders, [...list.filter((r) => r.sessionId !== sessionId), next]);
  return next;
}

/** Go back to the schedule default for this session. */
export function clearSessionReminder(sessionId: string): void {
  write(KEYS.reminders, load().filter((r) => r.sessionId !== sessionId));
}

/** Sessions of this week and next, shaped for reminders. */
export function upcomingSessions(now: Date = new Date()): PlannedSession[] {
  const monday = weekStartOf(toDateKey(now));
  return [...getWeekSchedule(monday), ...getWeekSchedule(addDays(monday, 7))].map((s) => ({
    ...s,
    title: getWorkout(s.workoutId)?.name ?? 'Workout',
  }));
}

export function pendingNotifications(now: Date = new Date()): ScheduledNotification[] {
  return notificationPlan(upcomingSessions(now), load(), now);
}

export function seedReminders(): void {
  write(KEYS.reminders, [{ id: 'rm-default', sessionId: null, enabled: true, minutesBefore: 15 }]);
}
