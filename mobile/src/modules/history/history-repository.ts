/** Owner: npdwuy. Durable writes use the same keys/facade as existing consumers. */
import { isDateKey, toDateKey } from '../../shared/dates';
import { KEYS, read, updateDurable, write } from '../../shared/storage';
import { parseReview, type Review } from '../checkin/review-model';
import {
  parseHistory,
  selectHistory,
  selectLastSets,
  type HistoryEntry,
  type HistoryFilter,
} from './history-model';

export type { HistoryEntry, HistoryFilter, SetRecord } from './history-model';
const allHistory = () =>
  read(KEYS.history, [] as HistoryEntry[], {
    parse: data => parseHistory(data, isDateKey),
  });
export const getHistory = (filter: HistoryFilter = {}) =>
  selectHistory(allHistory(), filter);
export const getLastSets = (exerciseId: string) =>
  selectLastSets(allHistory(), exerciseId);

export async function saveHistory(entry: HistoryEntry): Promise<HistoryEntry> {
  const parsed = parseHistory([entry], isDateKey)[0];
  if (
    !parsed ||
    !Number.isSafeInteger(entry.durationSec) ||
    entry.durationSec < 0 ||
    typeof entry.stoppedByPain !== 'boolean' ||
    !(
      entry.sessionId === null ||
      (typeof entry.sessionId === 'string' && entry.sessionId.trim())
    ) ||
    !entry.completedAt ||
    !Number.isFinite(Date.parse(entry.completedAt)) ||
    !Array.isArray(entry.sets) ||
    (!entry.sets.length && !entry.stoppedByPain) ||
    parsed.sets.length !== entry.sets.length ||
    parsed.sets.some(
      s =>
        s.durationSec === undefined &&
        (s.kg === null || s.kg > 1000 || s.reps < 1 || s.reps > 999),
    )
  ) {
    throw new Error('Invalid completed workout.');
  }
  const list = await updateDurable(KEYS.history, data => {
    const entries = parseHistory(data, isDateKey);
    const previous = entries.find(h => h.id === parsed.id);
    if (previous) {
      const { workoutTitle: previousTitle, stoppedExerciseId: previousExercise, ...previousResult } = previous;
      const { workoutTitle, stoppedExerciseId, ...result } = parsed;
      if (
        JSON.stringify(previousResult) !== JSON.stringify(result) ||
        (previousTitle && workoutTitle && previousTitle !== workoutTitle) ||
        (previousExercise && stoppedExerciseId && previousExercise !== stoppedExerciseId)
      ) {
        throw new Error('History ID already belongs to a different result.');
      }
      // A checkpoint from an older app version may already have saved the result.
      const metadata = {
        ...(!previousTitle && workoutTitle ? { workoutTitle } : {}),
        ...(!previousExercise && stoppedExerciseId ? { stoppedExerciseId } : {}),
      };
      return entries.map(entry => entry.id === parsed.id ? { ...entry, ...metadata } : entry);
    }
    return [parsed, ...entries];
  });
  return list.find(h => h.id === parsed.id)!;
}

const parseReviews = (data: unknown): Review[] =>
  Array.isArray(data)
    ? data
        .map(parseReview)
        .filter((r): r is Review => r !== null)
        .map(r => JSON.parse(JSON.stringify(r)) as Review)
    : [];
const allReviews = () =>
  read(KEYS.reviews, [] as Review[], { parse: parseReviews });

function validateReview(review: Review): Review {
  const parsed = parseReview(review);
  if (
    !parsed ||
    !parsed.id.trim() ||
    !getHistory().some(h => h.id === parsed.historyId) ||
    !Number.isFinite(Date.parse(parsed.createdAt)) ||
    !Number.isInteger(review.rpe) ||
    review.rpe < 1 ||
    review.rpe > 10
  ) {
    throw new Error('Invalid review or missing history.');
  }
  return JSON.parse(JSON.stringify(parsed)) as Review;
}

/** Compatibility API: cache acknowledgement only. UI must use appendReviewDurable. */
export function appendReview(review: Review): Review {
  const saved = validateReview(review);
  if (
    !write(KEYS.reviews, [
      ...allReviews().filter(r => r.historyId !== saved.historyId),
      saved,
    ])
  ) {
    throw new Error('Review could not be saved.');
  }
  return saved;
}

export async function appendReviewDurable(review: Review): Promise<Review> {
  const saved = validateReview(review);
  await updateDurable(KEYS.reviews, data => [
    ...parseReviews(data).filter(r => r.historyId !== saved.historyId),
    saved,
  ]);
  return saved;
}

export const getReview = (historyId: string): Review | null =>
  allReviews().find(r => r.historyId === historyId) ?? null;
export function getReviews(
  range: { from?: string; to?: string } = {},
): Review[] {
  return allReviews()
    .filter(r => {
      if (!Number.isFinite(Date.parse(r.createdAt))) return false;
      const day = toDateKey(new Date(r.createdAt));
      return (
        (!range.from || day >= range.from) && (!range.to || day <= range.to)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
