/**
 * Shared sample data — DATA_CONTRACT §8. Loaded once while `fitlens.seed` is
 * unset. Each owner seeds only their own data; this file just calls them.
 * All data is synthetic.
 */
import { seedHistory } from '../modules/history/history';
import { seedProfile } from '../modules/profile/profile';
import { seedReminders } from '../modules/reminders/reminders';
import { seedRhythm } from '../modules/rhythm/rhythm';
import { seedSchedule } from '../modules/workouts/schedule';
import { toDateKey, weekStartOf } from './dates';
import { KEYS, clearAll, has, write } from './storage';

export function seedAll(now: Date = new Date()): void {
  const today = toDateKey(now);
  const monday = weekStartOf(today);
  seedProfile();
  seedSchedule(today, monday);
  seedHistory(today, monday);
  seedRhythm();
  seedReminders();
  write(KEYS.seed, true);
}

export function ensureSeeded(now?: Date): void {
  if (!has(KEYS.seed)) seedAll(now);
}

/** "Reset sample data": wipe every fitlens.* key, then seed again. */
export function resetSampleData(now?: Date): void {
  clearAll();
  seedAll(now);
}
