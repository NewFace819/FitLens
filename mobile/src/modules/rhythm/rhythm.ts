/**
 * Rhythm public API — OWNER: Tu. Contract: getRhythm(date) → Rhythm (sync).
 * Writes only `fitlens.rhythm`; reads history and profile through their owners.
 */
import { toDateKey, type DateKey } from '../../shared/dates.ts';
import { KEYS, read, write } from '../../shared/storage.ts';
import { getHistory } from '../history/history.ts';
import { getProfile } from '../profile/profile.ts';
import { getWorkout } from '../workouts/schedule.ts';
import {
  EMPTY_STATE, computeRhythm, parseState, withPause, withResume, withWeeklyGoal,
  type Rhythm, type RhythmState,
} from './rhythm-model.ts';

const VERSION = 1;
const loadState = (): RhythmState => read(KEYS.rhythm, EMPTY_STATE, { version: VERSION, parse: parseState });
const saveState = (s: RhythmState) => write(KEYS.rhythm, s, VERSION);

export function getRhythm(date: DateKey = toDateKey(new Date())): Rhythm {
  const sessions = getHistory().map((h) => ({ id: h.id, date: h.date, title: getWorkout(h.workoutId)?.name ?? 'Workout' }));
  return computeRhythm(sessions, loadState(), getProfile().daysPerWeek, date);
}

/**
 * First goal: this week, or next Monday if asked. Once the rhythm is running
 * (an explicit goal or the profile goal with history), changes start next Monday
 * so the week in progress keeps the goal it started with.
 */
export function setWeeklyGoal(weeklyGoal: number, opts: { startNextMonday?: boolean } = {}, date: DateKey = toDateKey(new Date())): Rhythm {
  const running = !['empty', 'scheduled'].includes(getRhythm(date).status);
  saveState(withWeeklyGoal(loadState(), weeklyGoal, date, { startNextMonday: opts.startNextMonday || running }));
  return getRhythm(date);
}

export function pauseRhythm(date: DateKey = toDateKey(new Date())): Rhythm {
  saveState(withPause(loadState(), date));
  return getRhythm(date);
}

export function resumeRhythm(date: DateKey = toDateKey(new Date())): Rhythm {
  saveState(withResume(loadState(), date));
  return getRhythm(date);
}

/** Sample data follows the profile goal (weeklyGoal = null), contract §8. */
export function seedRhythm(): void {
  saveState(EMPTY_STATE);
}
