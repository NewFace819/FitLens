/** Owner: npdwuy. Stable facade for check-in, rhythm and seed consumers. */
import { addDays, type DateKey } from '../../shared/dates';
import { KEYS, write } from '../../shared/storage';
import type { HistoryEntry } from './history-model';
export * from './history-repository';

/** Synthetic history: six full weeks of 3 sessions + 2 this week. Never real data. */
export function seedHistory(today: DateKey, monday: DateKey): void {
  const workouts = ['tpl-upper', 'tpl-lower', 'tpl-full'];
  const entries: HistoryEntry[] = [];
  const add = (date: DateKey, workoutId: string, n: number) =>
    entries.push({
      id: `hs-seed${entries.length}`,
      sessionId: null,
      workoutId,
      date,
      durationSec: 40 * 60 + n * 60,
      stoppedByPain: false,
      sets: [{ exerciseId: workoutId === 'tpl-lower' ? 'goblet-squat' : 'bench-press', kg: workoutId === 'tpl-lower' ? 12 : null, reps: 10 }],
    });
  for (let w = 6; w >= 1; w--) {
    const start = addDays(monday, -7 * w);
    workouts.forEach((wk, i) => add(addDays(start, i * 2), wk, i));
  }
  // This week: sample-schedule sessions already in the past (seedSchedule marks those `done`).
  const thisWeek: [number, string][] = [[0, 'tpl-upper'], [2, 'tpl-lower'], [4, 'tpl-full']];
  for (const [day, workoutId] of thisWeek) {
    const date = addDays(monday, day);
    if (date >= today) continue;
    entries.push({
      id: `hs-seednow${day}`,
      sessionId: `ss-seed0${day}`,
      workoutId,
      date,
      durationSec: 45 * 60,
      stoppedByPain: false,
      sets: [{ exerciseId: workoutId === 'tpl-lower' ? 'goblet-squat' : 'bench-press', kg: null, reps: 10 }],
    });
  }
  write(KEYS.history, entries);
}
