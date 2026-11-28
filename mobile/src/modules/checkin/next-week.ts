/**
 * Next-week adjustment from last week's check-ins — OWNER: Tu. Read by Hải's Plan.
 *
 * One answer for "how should next week change, and why":
 * - `loadAdjust` (−0.3…+0.1) for generateDraft(…, loadAdjust), same scale as before (#28);
 * - `reason` + `message`, a short general sentence the Plan can show (never medical advice);
 * - `avoidRegions`: areas with reported pain, to avoid for that one week only (#29).
 *   They are NOT written to the profile (DATA_CONTRACT §9): only the user changes avoidRegions there.
 *
 * The pure parts take plain data so they are easy to test; `getNextWeekAdjustment()` reads storage.
 */
import { REGIONS, REGION_LABELS, isOneOf, type Region } from '../../shared/constants';
import { addDays, weekStartOf, type DateKey } from '../../shared/dates';
import { getHistory, getReviews } from '../history/history';
import { getExercise } from '../workouts/exercises';
import { weeklyLoadAdjust, type Review } from './review-model';

export type NextWeekReason = 'pain' | 'hard' | 'easy' | null;

export type LoadAdjustment = {
  /** −0.3 (pain) · −0.2 / −0.1 (felt very hard) · 0 · +0.1 (felt easy). */
  loadAdjust: number;
  /** Same values as Plan's `DraftAdjust.reason`. */
  reason: NextWeekReason;
  /** Short reason for the user, e.g. "You reported pain in your knees last week." */
  message: string;
};

export type NextWeekAdjustment = LoadAdjustment & {
  /** Extra areas to avoid next week only (pain reported there). Empty when no pain. */
  avoidRegions: Region[];
  /** Exercises that hurt last week (rated 10, linked to a pain report, or the one shown at a pain stop). */
  avoidExercises: string[];
};

/** The parts of a HistoryEntry this file reads. `stoppedExerciseId` may be missing on older entries. */
export type PainEntry = { id: string; stoppedByPain: boolean; stoppedExerciseId?: string | null };

const NO_CHANGE: LoadAdjustment = { loadAdjust: 0, reason: null, message: 'No check-ins last week yet, so nothing changes.' };

/** "knees", "knees and back", "knees, back and hips" */
export function regionList(regions: readonly Region[]): string {
  const names = regions.map((r) => REGION_LABELS[r].toLowerCase());
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

const reviewHasPain = (r: Review) =>
  r.exerciseFeedback.some((f) => f.feedback === 'painful') || r.discomfort.some((d) => d.sensation === 'pain');

/**
 * Pure (#28). Load change for next week plus a short reason, from last week's reviews and
 * the number of workouts stopped for pain (a pain stop counts even when its check-in was skipped).
 * No reviews and no pain stops → no change.
 */
export function explainLoadAdjust(
  lastWeekReviews: readonly Review[],
  stoppedByPainCount = 0,
  painRegions: readonly Region[] = [],
): LoadAdjustment {
  if (stoppedByPainCount > 0 || lastWeekReviews.some(reviewHasPain)) {
    return {
      loadAdjust: -0.3,
      reason: 'pain',
      message: painRegions.length
        ? `You reported pain in your ${regionList(painRegions)} last week.`
        : 'You reported pain last week.',
    };
  }
  if (!lastWeekReviews.length) return NO_CHANGE;
  // Thresholds stay in one place: weeklyLoadAdjust (review-model).
  const loadAdjust = weeklyLoadAdjust([...lastWeekReviews], 0);
  const avg = oneDecimal(lastWeekReviews.reduce((s, r) => s + r.rpe, 0) / lastWeekReviews.length);
  if (loadAdjust < 0) return { loadAdjust, reason: 'hard', message: `Last week felt very hard (average effort ${avg}/10).` };
  if (loadAdjust > 0) return { loadAdjust, reason: 'easy', message: `Last week felt easy (average effort ${avg}/10).` };
  return { loadAdjust: 0, reason: null, message: 'Last week’s effort looked about right, so nothing changes.' };
}

/**
 * Pure (#29). Areas and exercises to avoid next week, from last week's sessions and their reviews.
 * Per session with a pain signal:
 * - every area the user marked as "Pain";
 * - on a workout stopped for pain, every area noted in its check-in (any sensation);
 * - if that leaves no area, the areas of the exercises that hurt (`regionsOf`), so a pain stop
 *   without a check-in still protects something.
 */
export function painAreas(
  entries: readonly PainEntry[],
  reviews: readonly Review[],
  regionsOf: (exerciseId: string) => readonly Region[],
): { regions: Region[]; exercises: string[] } {
  const byHistory = new Map(reviews.map((r) => [r.historyId, r] as const));
  const regions = new Set<Region>();
  const exercises = new Set<string>();
  for (const entry of entries) {
    const review = byHistory.get(entry.id);
    const hurtExercises = new Set<string>();
    const hurtRegions = new Set<Region>();
    if (entry.stoppedByPain && typeof entry.stoppedExerciseId === 'string' && entry.stoppedExerciseId) {
      hurtExercises.add(entry.stoppedExerciseId);
    }
    if (review) {
      for (const f of review.exerciseFeedback) if (f.feedback === 'painful') hurtExercises.add(f.exerciseId);
      for (const d of review.discomfort) {
        if (d.sensation === 'pain' || entry.stoppedByPain) hurtRegions.add(d.region);
        if (d.sensation === 'pain' && d.exerciseId) hurtExercises.add(d.exerciseId);
      }
    }
    if (!hurtRegions.size) {
      for (const id of hurtExercises) for (const r of regionsOf(id)) if (isOneOf(REGIONS, r)) hurtRegions.add(r);
    }
    hurtRegions.forEach((r) => regions.add(r));
    hurtExercises.forEach((id) => exercises.add(id));
  }
  // Keep the shared region order so messages and tests are stable.
  return { regions: REGIONS.filter((r) => regions.has(r)), exercises: [...exercises] };
}

/**
 * For Hải's Plan: what to change for the week starting `weekStart`, from the week before it.
 * Synchronous on the hydrated cache; never throws on missing data (no history → no change).
 */
export function getNextWeekAdjustment(weekStart: DateKey): NextWeekAdjustment {
  const lastMonday = addDays(weekStartOf(weekStart), -7);
  const entries: PainEntry[] = getHistory({ from: lastMonday, to: addDays(lastMonday, 6) });
  const ids = new Set(entries.map((e) => e.id));
  const reviews = getReviews().filter((r) => ids.has(r.historyId));
  const pain = painAreas(entries, reviews, (id) => getExercise(id)?.regions ?? []);
  const stops = entries.filter((e) => e.stoppedByPain).length;
  return { ...explainLoadAdjust(reviews, stops, pain.regions), avoidRegions: pain.regions, avoidExercises: pain.exercises };
}

/**
 * Profile for generateDraft with next week's extra areas added (never removes one).
 * Returns a new object; the saved profile is not changed.
 */
export function withNextWeekAvoid<P extends { avoidRegions?: readonly Region[] }>(
  profile: P,
  adjustment: Pick<NextWeekAdjustment, 'avoidRegions'>,
): P & { avoidRegions: Region[] } {
  return { ...profile, avoidRegions: [...new Set([...(profile.avoidRegions ?? []), ...adjustment.avoidRegions])] };
}
