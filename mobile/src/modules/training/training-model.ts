/** Owner: npdwuy. Pure workout interactions, based on prototype/workout-active.js.
 * No clock, persistence, navigation, catalog or generated IDs in this module.
 */
import type { SetRecord } from '../history/history-model';

export type ExercisePlan = Readonly<{
  exerciseId: string;
  setCount: number;
  restSec: number;
  targetReps?: number | string;
}>;
export type SetValues =
  | { kg: number | null; reps: number | null; durationSec?: never }
  | { durationSec: number | null; kg?: never; reps?: never };
export type TrainingSet = Readonly<SetValues & { done: boolean }>;
export type TrainingExercise = Readonly<{
  exerciseId: string;
  restSec: number;
  targetReps?: number | string;
  sets: readonly TrainingSet[];
}>;
export type TrainingState = Readonly<{
  exercises: readonly TrainingExercise[];
  exerciseIndex: number;
  phase: 'working' | 'rest' | 'paused' | 'completed' | 'stopped';
  pausedFrom: 'working' | 'rest';
}>;
export type TrainingAction =
  | { type: 'addSet' }
  | ({ type: 'editSet'; setIndex: number } & SetValues)
  | { type: 'completeSet'; setIndex: number }
  | { type: 'undoSet'; setIndex: number }
  | { type: 'nextExercise' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'skipRest' }
  | { type: 'stopByPain' }
  | { type: 'finish' };
export type TrainingResult =
  | { ok: true; state: TrainingState }
  | {
      ok: false;
      state: TrainingState;
      reason: 'locked' | 'invalidSet' | 'invalidValues' | 'invalidTransition';
    };

// Null means not entered; zero kg is valid for bodyweight.
const validKg = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1000;
const validReps = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 999;

export const validTarget = (value: unknown): value is number | string =>
  validReps(value) || (typeof value === 'string' && value.trim().length > 0 && value.length <= 80);

export const isDurationTarget = (target: ExercisePlan['targetReps']): boolean =>
  typeof target === 'string' &&
  /^(?:\d+:[0-5]\d|\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:s|secs?|seconds?|m|mins?|minutes?))$/i.test(target.trim());

export const validDuration = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export function validSetValues(values: SetValues, done: boolean): boolean {
  if (values.durationSec !== undefined) {
    return values.kg === undefined && values.reps === undefined &&
      (validDuration(values.durationSec) || (!done && values.durationSec === null));
  }
  return (validKg(values.kg) || (!done && values.kg === null)) &&
    (validReps(values.reps) || (!done && values.reps === null));
}

const emptySet = (target: ExercisePlan['targetReps']): TrainingSet =>
  isDurationTarget(target)
    ? { durationSec: null, done: false }
    : { kg: null, reps: null, done: false };

/** Input comes from a workout adapter, not raw persisted training state. */
export function createTraining(
  plan: readonly ExercisePlan[],
): TrainingState | null {
  if (
    !Array.isArray(plan) ||
    plan.length === 0 ||
    plan.some(
      item =>
        !item ||
        typeof item.exerciseId !== 'string' ||
        item.exerciseId.trim() === '' ||
        !Number.isSafeInteger(item.setCount) ||
        item.setCount <= 0 ||
        !Number.isSafeInteger(item.restSec) ||
        item.restSec < 0 ||
        (item.targetReps !== undefined && !validTarget(item.targetReps)),
    )
  )
    return null;
  return {
    exercises: plan.map(item => ({
      exerciseId: item.exerciseId,
      restSec: item.restSec,
      ...(item.targetReps !== undefined ? { targetReps: item.targetReps } : {}),
      sets: Array.from({ length: item.setCount }, () => emptySet(item.targetReps)),
    })),
    exerciseIndex: 0,
    phase: 'working',
    pausedFrom: 'working',
  };
}

/** Rejected actions leave state unchanged. Terminal states cannot resume or edit.
 * 'completed' means user finished, NOT that data was durably saved.
 * Caller must keep this state until the persistence layer confirms success.
 */
export function transitionTraining(
  state: TrainingState,
  action: TrainingAction,
): TrainingResult {
  const fail = (
    reason: Extract<TrainingResult, { ok: false }>['reason'],
  ): TrainingResult => ({ ok: false, state, reason });
  const accept = (next: TrainingState): TrainingResult => ({
    ok: true,
    state: next,
  });
  if (state.phase === 'completed' || state.phase === 'stopped')
    return fail('locked');
  if (action.type === 'stopByPain')
    return accept({ ...state, phase: 'stopped' });
  if (action.type === 'finish') return accept({ ...state, phase: 'completed' });
  if (action.type === 'pause') {
    return state.phase === 'paused'
      ? fail('invalidTransition')
      : accept({ ...state, phase: 'paused', pausedFrom: state.phase });
  }
  if (action.type === 'resume') {
    return state.phase === 'paused'
      ? accept({ ...state, phase: state.pausedFrom })
      : fail('invalidTransition');
  }
  if (state.phase === 'paused') return fail('locked');
  if (action.type === 'skipRest') {
    return state.phase === 'rest'
      ? accept({ ...state, phase: 'working' })
      : fail('invalidTransition');
  }
  if (action.type === 'nextExercise') {
    return state.exerciseIndex + 1 < state.exercises.length
      ? accept({
          ...state,
          exerciseIndex: state.exerciseIndex + 1,
          phase: 'working',
        })
      : fail('invalidTransition');
  }
  const exercise = state.exercises[state.exerciseIndex];
  if (action.type === 'addSet') {
    if (!exercise) return fail('invalidTransition');
    const sets = [...exercise.sets, emptySet(exercise.targetReps)];
    return accept({
      ...state,
      exercises: state.exercises.map((row, index) =>
        index === state.exerciseIndex ? { ...exercise, sets } : row,
      ),
    });
  }
  if (
    !exercise ||
    !Number.isInteger(action.setIndex) ||
    !exercise.sets[action.setIndex]
  ) {
    return fail('invalidSet');
  }
  const set = exercise.sets[action.setIndex];
  const timed = isDurationTarget(exercise.targetReps);
  let updated: TrainingSet;
  let phase = state.phase;
  switch (action.type) {
    case 'editSet':
      if (set.done) return fail('locked');
      if (
        timed !== (action.durationSec !== undefined) || !validSetValues(action, false)
      )
        return fail('invalidValues');
      updated = action.durationSec !== undefined
        ? { durationSec: action.durationSec, done: false }
        : { kg: action.kg, reps: action.reps, done: false };
      break;
    case 'completeSet':
      if (set.done) return fail('invalidTransition');
      if (timed !== (set.durationSec !== undefined) || !validSetValues(set, true))
        return fail('invalidValues');
      updated = { ...set, done: true };
      phase =
        exercise.restSec > 0 &&
        exercise.sets.some(
          (row, index) => index !== action.setIndex && !row.done,
        )
          ? 'rest'
          : 'working';
      break;
    case 'undoSet':
      if (!set.done) return fail('invalidTransition');
      updated = { ...set, done: false };
      phase = 'working';
      break;
    default:
      return fail('invalidTransition');
  }
  const sets = exercise.sets.map((row, index) =>
    index === action.setIndex ? updated : row,
  );
  return accept({
    ...state,
    phase,
    exercises: state.exercises.map((row, index) =>
      index === state.exerciseIndex ? { ...exercise, sets } : row,
    ),
  });
}

/** Export only performed sets, never pending targets or 'Use last time' drafts.
 * Does not save history. Caller supplies history ID/date/duration and handles
 * the prototype's empty ordinary-finish case separately from a pain stop.
 */
export function completedSets(state: TrainingState): SetRecord[] {
  return state.exercises.flatMap(exercise =>
    exercise.sets.flatMap((set): SetRecord[] => {
      if (!set.done) return [];
      const { exerciseId } = exercise;
      if (validDuration(set.durationSec)) return [{ exerciseId, durationSec: set.durationSec }];
      if (validKg(set.kg) && validReps(set.reps)) return [{ exerciseId, kg: set.kg, reps: set.reps }];
      return [];
    }),
  );
}
