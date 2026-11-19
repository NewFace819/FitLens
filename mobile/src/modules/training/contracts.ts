/** Owner: Đức Huy (npdwuy). Integration interfaces. */
import type {
  HistoryEntry,
  HistoryFilter,
  SetRecord,
} from '../history/history-model';

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

/** Runtime persistence is bound by training-service and history-repository.
 * Completion and check-in use durable acknowledgements; legacy sync writes
 * acknowledge only the shared cache.
 */
