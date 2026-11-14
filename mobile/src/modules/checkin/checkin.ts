/**
 * Check-in public API — OWNER: Tu.
 * Reads the finished session through Đức Huy / Hải, saves only through
 * appendReview() (Tu never writes history) and sets the mascot through Đỗ Huy.
 */
import { addDays, toDateKey, weekStartOf } from '../../shared/dates.ts';
import { appendReview, getHistory, getReview, getReviews, type HistoryEntry } from '../history/history.ts';
import { setMascotMood } from '../mascot/mascot.ts';
import { getExercise } from '../workouts/exercises.ts';
import { getWorkout } from '../workouts/schedule.ts';
import { buildReview, moodAfterReview, weeklyLoadAdjust, type Review, type ReviewDraft } from './review-model.ts';

export type CheckInContext = {
  entry: HistoryEntry;
  title: string;
  exercises: { id: string; name: string }[];
  setCount: number;
  existing: Review | null;
};

/** Everything the check-in screen needs for `?history=<id>`, or null if it doesn't exist. */
export function getCheckInContext(historyId: string): CheckInContext | null {
  const entry = getHistory().find((h) => h.id === historyId);
  if (!entry) return null;
  const workout = getWorkout(entry.workoutId);
  const ids = workout ? workout.items.map((i) => i.exerciseId) : [...new Set(entry.sets.map((s) => s.exerciseId))];
  return {
    entry,
    title: workout?.name ?? 'Workout',
    exercises: ids.map((id) => ({ id, name: getExercise(id)?.name ?? id })),
    setCount: entry.sets.length || (workout?.items.reduce((n, i) => n + i.sets, 0) ?? 0),
    existing: getReview(historyId),
  };
}

export function submitCheckIn(draft: ReviewDraft, stoppedByPain: boolean, now: Date = new Date()): Review {
  const saved = appendReview(buildReview(draft, now));
  setMascotMood(moodAfterReview(draft, stoppedByPain));
  return saved;
}

/** For Hải's generateDraft(…, loadAdjust): based on last week's reviews and pain stops. */
export function getLoadAdjustForWeek(weekStart: string): number {
  const lastMonday = addDays(weekStartOf(weekStart), -7);
  const lastSunday = addDays(lastMonday, 6);
  const entries = getHistory({ from: lastMonday, to: lastSunday });
  const ids = new Set(entries.map((e) => e.id));
  const reviews = getReviews().filter((r) => ids.has(r.historyId));
  return weeklyLoadAdjust(reviews, entries.filter((e) => e.stoppedByPain).length);
}

/** Latest finished session without a review (for "check in now" entry points). */
export function latestUnreviewed(): HistoryEntry | null {
  return getHistory().find((h) => !getReview(h.id) && h.date <= toDateKey(new Date())) ?? null;
}
