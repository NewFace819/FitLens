/**
 * Shared sample data — DATA_CONTRACT §8. Loaded once while `fitlens.seed` is
 * unset. Each owner seeds only their own data; this file just calls them.
 * All data is synthetic.
 */
import { seedHistory } from '../modules/history/history.ts';
import { seedProfile } from '../modules/profile/profile.ts';
import { seedReminders } from '../modules/reminders/reminders.ts';
import { seedRhythm } from '../modules/rhythm/rhythm.ts';
import { seedSchedule } from '../modules/workouts/schedule.ts';
import { toDateKey, weekStartOf } from './dates.ts';
import { KEYS, clearAll, has, write } from './storage.ts';

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
