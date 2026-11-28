/**
 * Check-in public API — OWNER: Tu.
 * Reads the finished session through Đức Huy / Hải, saves only through
 * appendReview() (Tu never writes history) and sets the mascot through Đỗ Huy.
 */
import { addDays, toDateKey } from '../../shared/dates';
import { appendReview, appendReviewDurable, getHistory, getReview, type HistoryEntry } from '../history/history';
import { setMascotMood } from '../mascot/mascot';
import { getExercise } from '../workouts/exercises';
import { getWorkout } from '../workouts/schedule';
import { getNextWeekAdjustment } from './next-week';
import { buildReview, moodAfterReview, type Review, type ReviewDraft } from './review-model';

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

/** Only the newest session speaks for how the user feels now (getHistory is newest first). */
const isLatestSession = (historyId: string) => getHistory()[0]?.id === historyId;

/** Editing an older session's check-in saves the review but leaves today's mood alone. */
function moodFromCheckIn(draft: ReviewDraft, stoppedByPain: boolean) {
  if (isLatestSession(draft.historyId)) setMascotMood(moodAfterReview(draft, stoppedByPain));
}

export function submitCheckIn(draft: ReviewDraft, stoppedByPain: boolean, now: Date = new Date()): Review {
  const saved = appendReview(buildReview(draft, now));
  moodFromCheckIn(draft, stoppedByPain);
  return saved;
}

/** UI acknowledgement comes only after the review has reached device storage. */
export async function submitCheckInDurable(draft: ReviewDraft, stoppedByPain: boolean, now: Date = new Date()): Promise<Review> {
  const saved = await appendReviewDurable(buildReview(draft, now));
  moodFromCheckIn(draft, stoppedByPain);
  return saved;
}

/**
 * Called when the check-in opens. A workout stopped for pain makes the mascot concerned right
 * away, so skipping the check-in (Skip, Back, Android back) can't leave it looking happy.
 * Only for the newest session and only before its check-in exists.
 */
export function notePainStop(historyId: string): void {
  const entry = getHistory().find((h) => h.id === historyId);
  if (entry?.stoppedByPain && !getReview(historyId) && isLatestSession(historyId)) setMascotMood('concerned');
}

/**
 * For Hải's generateDraft(…, loadAdjust): −0.3…+0.1 from last week's reviews and pain stops.
 * The reason and the areas to avoid come with getNextWeekAdjustment() (./next-week).
 */
export function getLoadAdjustForWeek(weekStart: string): number {
  return getNextWeekAdjustment(weekStart).loadAdjust;
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
