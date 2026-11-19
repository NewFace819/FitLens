/**
 * Workouts & weekly schedule — OWNER: Hải. Contract functions (DATA_CONTRACT §6) that other
 * modules call. They delegate to the shared models through ./store, so the app and the browser
 * prototype run the same code.
 */
import { addDays, type DateKey, type TimeOfDay } from '../../shared/dates';
import { KEYS, write, updateDurable, localStorageView } from '../../shared/storage';
import { getStore } from './store';
import type { Session, Workout } from './types';
const { createScheduleModel } = require('../../../../prototype/schedule-model.js');


export type { Session, Workout, WorkoutItem } from './types';

export type UpdateSessionResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'notFound' | 'invalidDate' | 'invalidTime' | 'conflict' | 'storage' };

export function getWorkout(id: string): Workout | null {
  return getStore().getWorkout(id);
}

export const getSession = (id: string): Session | null => createScheduleModel(localStorageView).getSession(id);

/** Run the owner's model against the queued snapshot, then await device persistence. */
export async function markSessionDoneDurable(sessionId: string): Promise<Session | null> {
  let result: Session | null = null;
  await updateDurable(KEYS.sessions, data => {
    let envelope = JSON.stringify({ v: 1, data: data ?? [] });
    const model = createScheduleModel({
      getItem: () => envelope,
      setItem: (_key: string, raw: string) => { envelope = raw; },
    });
    result = model.markSessionDone(sessionId);
    return JSON.parse(envelope).data;
  });
  return result;
}

/** Sessions of the week starting `weekStart` (Monday), sorted by date then time. */
export function getWeekSchedule(weekStart: DateKey): Session[] {
  return getStore().getWeekSchedule(weekStart);
}

/** Change only date/time. A time already used by another session that day → `conflict`. */
export function updateSession(id: string, patch: { date?: DateKey; time?: TimeOfDay | null }): UpdateSessionResult {
  return getStore().updateSession(id, patch) as UpdateSessionResult;
}

/** Nearest planned session from `now` (sessions without a time count from the start of their day). */
export function getNextSession(now: Date = new Date()): Session | null {
  return getStore().getNextSession(now);
}

export function markSessionDone(sessionId: string): Session | null {
  return getStore().markSessionDone(sessionId);
}

/** Sample week: Mon/Wed/Fri (+ next week) so reminders have something to show. Synthetic data only. */
export function seedSchedule(today: DateKey, monday: DateKey): void {
  const plan: [number, string, TimeOfDay | null][] = [[0, 'tpl-upper', '18:00'], [2, 'tpl-lower', '07:00'], [4, 'tpl-full', null]];
  const sessions: Session[] = [];
  for (const week of [0, 7]) {
    for (const [day, workoutId, time] of plan) {
      const date = addDays(monday, week + day);
      sessions.push({ id: `ss-seed${week}${day}`, workoutId, date, time, status: date < today ? 'done' : 'planned' });
    }
  }
  write(KEYS.sessions, sessions);
}
