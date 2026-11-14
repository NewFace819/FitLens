/**
 * Workouts & weekly schedule — OWNER: Hải.
 * ⚠️ PLACEHOLDER by Tu implementing the contract functions Tu needs
 * (DATA_CONTRACT §6): getWorkout, getWeekSchedule, updateSession,
 * getNextSession, markSessionDone. Hải replaces this file.
 */
import { SESSION_STATUSES, isOneOf, type SessionStatus } from '../../shared/constants.ts';
import { addDays, isDateKey, isTime, toDateKey, toMinutes, type DateKey, type TimeOfDay } from '../../shared/dates.ts';
import { KEYS, read, write } from '../../shared/storage.ts';

export type WorkoutItem = { exerciseId: string; sets: number; reps: number };
export type Workout = { id: string; name: string; items: WorkoutItem[] };

export type Session = {
  id: string;
  workoutId: string;
  date: DateKey;
  time: TimeOfDay | null;
  status: SessionStatus;
};

export const TEMPLATES: Workout[] = [
  {
    id: 'tpl-upper',
    name: 'Upper body',
    items: [
      { exerciseId: 'push-up', sets: 3, reps: 10 },
      { exerciseId: 'dumbbell-row', sets: 3, reps: 10 },
      { exerciseId: 'shoulder-press', sets: 3, reps: 10 },
      { exerciseId: 'band-pull-apart', sets: 2, reps: 15 },
    ],
  },
  {
    id: 'tpl-lower',
    name: 'Lower body',
    items: [
      { exerciseId: 'goblet-squat', sets: 3, reps: 10 },
      { exerciseId: 'romanian-deadlift', sets: 3, reps: 10 },
      { exerciseId: 'reverse-lunge', sets: 3, reps: 8 },
      { exerciseId: 'glute-bridge', sets: 2, reps: 12 },
    ],
  },
  {
    id: 'tpl-full',
    name: 'A gentle full body',
    items: [
      { exerciseId: 'goblet-squat', sets: 3, reps: 10 },
      { exerciseId: 'push-up', sets: 3, reps: 8 },
      { exerciseId: 'dumbbell-row', sets: 3, reps: 10 },
      { exerciseId: 'plank', sets: 2, reps: 1 },
    ],
  },
];

export function getWorkout(id: string): Workout | null {
  return TEMPLATES.find((w) => w.id === id) ?? null;
}

function parseSessions(data: unknown): Session[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((s): s is Session => !!s && typeof s.id === 'string' && typeof s.workoutId === 'string' && isDateKey(s.date))
    .map((s) => ({ ...s, time: isTime(s.time) ? s.time : null, status: isOneOf(SESSION_STATUSES, s.status) ? s.status : 'planned' }));
}

const allSessions = () => read(KEYS.sessions, [] as Session[], { parse: parseSessions });
const byDateTime = (a: Session, b: Session) => (a.date + (a.time ?? '99:99')).localeCompare(b.date + (b.time ?? '99:99'));

/** Sessions of the week starting `weekStart` (Monday), sorted by date then time. */
export function getWeekSchedule(weekStart: DateKey): Session[] {
  const end = addDays(weekStart, 6);
  return allSessions().filter((s) => s.date >= weekStart && s.date <= end).sort(byDateTime);
}

/** Change only date/time. Refuses a time already used by another session that day. */
export function updateSession(id: string, patch: { date?: DateKey; time?: TimeOfDay | null }): Session | null {
  const list = allSessions();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) {
    console.warn('updateSession: unknown session', id);
    return null;
  }
  const next = { ...list[i] };
  if (patch.date !== undefined && isDateKey(patch.date)) next.date = patch.date;
  if (patch.time !== undefined && (patch.time === null || isTime(patch.time))) next.time = patch.time;
  if (next.time && list.some((s) => s.id !== id && s.date === next.date && s.time === next.time)) {
    console.warn('updateSession: time clash', next.date, next.time);
    return null;
  }
  list[i] = next;
  write(KEYS.sessions, list);
  return next;
}

/** Nearest planned session from `now` (sessions without a time count from the start of their day). */
export function getNextSession(now: Date = new Date()): Session | null {
  const today = toDateKey(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    allSessions()
      .filter((s) => s.status === 'planned' && (s.date > today || (s.date === today && (s.time === null || toMinutes(s.time) >= minutes))))
      .sort(byDateTime)[0] ?? null
  );
}

export function markSessionDone(sessionId: string): Session | null {
  const list = allSessions();
  const i = list.findIndex((s) => s.id === sessionId);
  if (i < 0) return null;
  list[i] = { ...list[i], status: 'done' };
  write(KEYS.sessions, list);
  return list[i];
}

/** Sample week: Mon/Wed/Fri (+ next week) so reminders have something to show. */
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
