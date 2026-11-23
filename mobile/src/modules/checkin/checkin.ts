/**
 * Check-in public API — OWNER: Tu.
 * Reads the finished session through Đức Huy / Hải, saves only through
 * appendReview() (Tu never writes history) and sets the mascot through Đỗ Huy.
 */
import { addDays, toDateKey, weekStartOf } from '../../shared/dates';
import { appendReview, appendReviewDurable, getHistory, getReview, getReviews, type HistoryEntry } from '../history/history';
import { setMascotMood } from '../mascot/mascot';
import { getExercise } from '../workouts/exercises';
import { getWorkout } from '../workouts/schedule';
import { buildReview, moodAfterReview, weeklyLoadAdjust, type Review, type ReviewDraft } from './review-model';

const exerciseOption = (id: string) => ({ id, name: getExercise(id)?.name ?? id });

export type CheckInContext = {
  entry: HistoryEntry;
  title: string;
  exercises: ReturnType<typeof exerciseOption>[];
  discomfortExercises: ReturnType<typeof exerciseOption>[];
  setCount: number;
  existing: Review | null;
};

/** Everything the check-in screen needs for `?history=<id>`, or null if it doesn't exist. */
export function getCheckInContext(historyId: string): CheckInContext | null {
  const entry = getHistory().find((h) => h.id === historyId);
  if (!entry) return null;
  const ids = [...new Set(entry.sets.map((s) => s.exerciseId))];
  const exercises = ids.map(exerciseOption);
  const { stoppedExerciseId } = entry;
  return {
    entry,
    title: entry.workoutTitle ?? getWorkout(entry.workoutId)?.title ?? 'Workout',
    exercises,
    discomfortExercises: stoppedExerciseId && !ids.includes(stoppedExerciseId)
      ? [...exercises, exerciseOption(stoppedExerciseId)]
      : exercises,
    setCount: entry.sets.length,
    existing: getReview(historyId),
  };
}

export function submitCheckIn(draft: ReviewDraft, stoppedByPain: boolean, now: Date = new Date()): Review {
  const saved = appendReview(buildReview(draft, now));
  setMascotMood(moodAfterReview(draft, stoppedByPain));
  return saved;
}

/** UI acknowledgement comes only after the review has reached device storage. */
export async function submitCheckInDurable(draft: ReviewDraft, stoppedByPain: boolean, now: Date = new Date()): Promise<Review> {
  const saved = await appendReviewDurable(buildReview(draft, now));
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

/**
 * Latest finished session without a review, done within the last `withinDays`
 * days (for "check in now" entry points). A fallback in case the workout screen
 * didn't open the check-in; older sessions are not worth asking about.
 */
export function latestUnreviewed(withinDays = 2, now: Date = new Date()): HistoryEntry | null {
  const today = toDateKey(now);
  const from = addDays(today, -withinDays);
  return getHistory({ from, to: today }).find((h) => !getReview(h.id)) ?? null;
}

/** "Upper Body, Wed" style label for a check-in prompt. */
export function checkInPrompt(entry: HistoryEntry): string {
  return entry.workoutTitle ?? getWorkout(entry.workoutId)?.title ?? 'Your workout';
}
