/** Owner: Đức Huy (npdwuy). Pure helpers; no UI, storage or shared-module writes. */
export type SetRecord = { exerciseId: string } & (
  | { kg: number | null; reps: number; durationSec?: never }
  | { durationSec: number; kg?: never; reps?: never }
);

// Structural match for Tu's history placeholder. Date validation is supplied by
// the shared date module when the integration branch is selected.
export type HistoryEntry = {
  id: string;
  sessionId: string | null;
  workoutId: string;
  workoutTitle?: string;
  date: string;
  durationSec: number;
  stoppedByPain: boolean;
  stoppedExerciseId?: string;
  sets: SetRecord[];
  completedAt?: string;
};

export type HistoryFilter = {
  from?: string;
  to?: string;
  workoutId?: string;
  exerciseId?: string;
};

export type DateValidator = (value: string) => boolean;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonBlankString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function parseSetRecord(value: unknown): SetRecord | null {
  if (!isObject(value) || !isNonBlankString(value.exerciseId)) return null;
  if (value.durationSec !== undefined) {
    if (!isNonNegativeInteger(value.durationSec) || value.durationSec === 0 ||
        value.kg !== undefined || value.reps !== undefined) return null;
    return { exerciseId: value.exerciseId, durationSec: value.durationSec };
  }
  if (
    !isNonNegativeInteger(value.reps) ||
    !(
      value.kg === null ||
      (typeof value.kg === 'number' &&
        Number.isFinite(value.kg) &&
        value.kg >= 0)
    )
  ) {
    return null;
  }
  return { exerciseId: value.exerciseId, kg: value.kg, reps: value.reps };
}

/** Read boundary: discard malformed entries/sets without touching the input. */
export function parseHistory(
  data: unknown,
  isDate: DateValidator,
): HistoryEntry[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry): HistoryEntry[] => {
    if (
      !isObject(entry) ||
      !isNonBlankString(entry.id) ||
      !isNonBlankString(entry.workoutId) ||
      typeof entry.date !== 'string' ||
      !isDate(entry.date)
    )
      return [];
    const sets = Array.isArray(entry.sets)
      ? entry.sets
          .map(parseSetRecord)
          .filter((set): set is SetRecord => set !== null)
      : [];
    return [
      {
        id: entry.id,
        sessionId: isNonBlankString(entry.sessionId) ? entry.sessionId : null,
        workoutId: entry.workoutId,
        ...(isNonBlankString(entry.workoutTitle) ? { workoutTitle: entry.workoutTitle } : {}),
        date: entry.date,
        durationSec: isNonNegativeInteger(entry.durationSec)
          ? entry.durationSec
          : 0,
        stoppedByPain: entry.stoppedByPain === true,
        ...(entry.stoppedByPain === true && isNonBlankString(entry.stoppedExerciseId)
          ? { stoppedExerciseId: entry.stoppedExerciseId }
          : {}),
        sets,
        ...(typeof entry.completedAt === 'string' &&
        Number.isFinite(Date.parse(entry.completedAt))
          ? { completedAt: new Date(entry.completedAt).toISOString() }
          : {}),
      },
    ];
  });
}

const copyEntry = (entry: HistoryEntry): HistoryEntry => ({
  ...entry,
  sets: entry.sets.map(set => ({ ...set })),
});

/** Inclusive date range. Same-day entries keep source order, not random ID order.
 * Caller must supply newest-first order for same-day entries until a shared
 * completion timestamp is agreed. Returned values cannot mutate repository data.
 */
export function selectHistory(
  entries: readonly HistoryEntry[],
  filter: HistoryFilter = {},
): HistoryEntry[] {
  return entries
    .filter(
      entry =>
        (!filter.from || entry.date >= filter.from) &&
        (!filter.to || entry.date <= filter.to) &&
        (!filter.workoutId || entry.workoutId === filter.workoutId) &&
        (!filter.exerciseId ||
          entry.sets.some(set => set.exerciseId === filter.exerciseId)),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
    )
    .map(copyEntry);
}

export function selectLastSets(
  entries: readonly HistoryEntry[],
  exerciseId: string,
): SetRecord[] {
  if (!exerciseId) return [];
  const latest = selectHistory(entries, { exerciseId })[0];
  return latest ? latest.sets.filter(set => set.exerciseId === exerciseId) : [];
}
