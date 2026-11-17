/** Owner: Đức Huy (npdwuy). Integration ports only; no global singleton yet. */
import type { HistoryEntry, HistoryFilter, SetRecord } from '../history/history-model';

/** Use Tu's Review type as TReview; do not duplicate check-in's schema here. */
export interface HistoryReader {
  getHistory(filter?: HistoryFilter): HistoryEntry[];
  getLastSets(exerciseId: string): SetRecord[];
}

export interface ReviewRepository<TReview> {
  appendReview(review: TReview): TReview;
  getReview(historyId: string): TReview | null;
  getReviews(range?: { from?: string; to?: string }): TReview[];
}

/** Runtime persistence and completion orchestration are deliberately not bound.
 * Before adding them, agree on durable-write acknowledgement with the shared
 * storage owner. A synchronous cache write is not proof of a successful save.
 */
