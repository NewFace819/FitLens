/**
 * Training history & reviews — OWNER: Đức Huy.
 * ⚠️ PLACEHOLDER by Tu implementing the contract (DATA_CONTRACT §6, §9):
 * getHistory(filter), getLastSets, appendReview, getReview, getReviews.
 * The Review *shape* is Tu's (modules/checkin/review-model.ts); storing it is
 * Đức Huy's. Đức Huy replaces the implementation, keeping these signatures.
 */
import { addDays, isDateKey, toDateKey, type DateKey } from '../../shared/dates.ts';
import { KEYS, read, write } from '../../shared/storage.ts';
import { parseReview, type Review } from '../checkin/review-model.ts';

export type SetRecord = { exerciseId: string; kg: number | null; reps: number };

export type HistoryEntry = {
  id: string;
  sessionId: string | null;
  workoutId: string;
  date: DateKey;
  durationSec: number;
  stoppedByPain: boolean;
  sets: SetRecord[];
};

export type HistoryFilter = { from?: DateKey; to?: DateKey; workoutId?: string; exerciseId?: string };

function parseHistory(data: unknown): HistoryEntry[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((h): h is HistoryEntry => !!h && typeof h.id === 'string' && typeof h.workoutId === 'string' && isDateKey(h.date))
    .map((h) => ({
      ...h,
      sessionId: typeof h.sessionId === 'string' ? h.sessionId : null,
      durationSec: Number.isFinite(h.durationSec) ? h.durationSec : 0,
      stoppedByPain: h.stoppedByPain === true,
      sets: Array.isArray(h.sets) ? h.sets : [],
    }));
}

/** Newest first. `from`/`to` are inclusive. */
export function getHistory(filter: HistoryFilter = {}): HistoryEntry[] {
  return read(KEYS.history, [] as HistoryEntry[], { parse: parseHistory })
    .filter((h) =>
      (!filter.from || h.date >= filter.from) &&
      (!filter.to || h.date <= filter.to) &&
      (!filter.workoutId || h.workoutId === filter.workoutId) &&
      (!filter.exerciseId || h.sets.some((s) => s.exerciseId === filter.exerciseId)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function getLastSets(exerciseId: string): SetRecord[] {
  const entry = getHistory({ exerciseId })[0];
  return entry ? entry.sets.filter((s) => s.exerciseId === exerciseId) : [];
}

const allReviews = () =>
  read(KEYS.reviews, [] as Review[], {
    parse: (data) => (Array.isArray(data) ? data.map(parseReview).filter((r): r is Review => r !== null) : []),
  });

/** Save a check-in. One review per history entry: re-saving replaces it. Returns the saved review. */
export function appendReview(review: Review): Review {
  const list = allReviews().filter((r) => r.historyId !== review.historyId);
  write(KEYS.reviews, [...list, review]);
  return review;
}

export function getReview(historyId: string): Review | null {
  return allReviews().find((r) => r.historyId === historyId) ?? null;
}

/** Newest first; `from`/`to` compare the local calendar day the review was saved. */
export function getReviews(range: { from?: DateKey; to?: DateKey } = {}): Review[] {
  return allReviews()
    .filter((r) => {
      const day = toDateKey(new Date(r.createdAt));
      return (!range.from || day >= range.from) && (!range.to || day <= range.to);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

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
      sets: [{ exerciseId: workoutId === 'tpl-lower' ? 'goblet-squat' : 'push-up', kg: workoutId === 'tpl-lower' ? 12 : null, reps: 10 }],
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
      sets: [{ exerciseId: workoutId === 'tpl-lower' ? 'goblet-squat' : 'push-up', kg: null, reps: 10 }],
    });
  }
  write(KEYS.history, entries);
}
