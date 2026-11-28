/** Pure clock + resumable workout snapshot. Background time counts; explicit pause freezes time. */
import {
  createTraining,
  isDurationTarget,
  validSetValues,
  validTarget,
  transitionTraining,
  type TrainingState,
  type TrainingAction,
  type TrainingExercise,
  type ExercisePlan,
} from './training-model';
import type { SetRecord } from '../history/history-model';

export type ActiveTraining = Readonly<{
  v: 1;
  id: string;
  workoutId: string;
  sessionId: string | null;
  title: string;
  training: TrainingState;
  clockMs: number;
  elapsedMs: number;
  restMs: number;
  finishedAt: string | null;
  revision: number;
}>;
const validTime = (n: unknown): n is number =>
  typeof n === 'number' &&
  Number.isSafeInteger(n) &&
  n >= 0 &&
  n <= 8640000000000000;
const id = (s: unknown): s is string =>
  typeof s === 'string' && s.trim().length > 0;
const terminal = (state: TrainingState) =>
  state.phase === 'completed' || state.phase === 'stopped';

export function startTraining(
  input: {
    id: string;
    workoutId: string;
    sessionId: string | null;
    title: string;
    plan: readonly ExercisePlan[];
  },
  nowMs: number,
): ActiveTraining | null {
  const training = createTraining(input.plan);
  if (
    !training ||
    !validTime(nowMs) ||
    !id(input.id) ||
    !id(input.workoutId) ||
    !id(input.title) ||
    !(input.sessionId === null || id(input.sessionId))
  )
    return null;
  return {
    v: 1,
    id: input.id,
    workoutId: input.workoutId,
    sessionId: input.sessionId,
    title: input.title,
    training,
    clockMs: nowMs,
    elapsedMs: 0,
    restMs: 0,
    finishedAt: null,
    revision: 0,
  };
}

export function advanceClock(
  session: ActiveTraining,
  nowMs: number,
): ActiveTraining {
  if (!validTime(nowMs) || terminal(session.training)) return session;
  const clockMs = Math.max(nowMs, session.clockMs); // A backwards wall clock never subtracts elapsed time.
  const delta = clockMs - session.clockMs;
  if (session.training.phase === 'paused') return { ...session, clockMs };
  return {
    ...session,
    clockMs,
    elapsedMs: session.elapsedMs + delta,
    restMs:
      session.training.phase === 'rest'
        ? Math.max(0, session.restMs - delta)
        : 0,
  };
}

export function actOnSession(
  session: ActiveTraining,
  action: TrainingAction,
  nowMs: number,
): ActiveTraining {
  const timed = advanceClock(session, nowMs);
  const result = transitionTraining(timed.training, action);
  if (!result.ok) throw new Error(result.reason);
  let restMs = timed.restMs;
  if (action.type === 'completeSet' && result.state.phase === 'rest') {
    restMs = result.state.exercises[result.state.exerciseIndex].restSec * 1000;
  } else if (
    result.state.phase !== 'rest' &&
    !(result.state.phase === 'paused' && result.state.pausedFrom === 'rest')
  ) {
    restMs = 0;
  }
  return {
    ...timed,
    training: result.state,
    restMs,
    revision: session.revision + 1,
    finishedAt: terminal(result.state)
      ? new Date(timed.clockMs).toISOString()
      : null,
  };
}

export function extendRest(
  session: ActiveTraining,
  seconds: number,
  nowMs: number,
): ActiveTraining {
  if (
    session.training.phase !== 'rest' ||
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    seconds > 3600
  ) {
    throw new Error('Rest cannot be extended now.');
  }
  const timed = advanceClock(session, nowMs);
  return {
    ...timed,
    restMs: timed.restMs + seconds * 1000,
    revision: session.revision + 1,
  };
}

/** Match unfinished rows by position and preserve a draft load when history has none. */
export function lastSetEdits(
  exercise: TrainingExercise,
  previous: readonly SetRecord[],
): Extract<TrainingAction, { type: 'editSet' }>[] {
  const timed = isDurationTarget(exercise.targetReps);
  const sets = previous.filter(
    set =>
      set.exerciseId === exercise.exerciseId && (set.durationSec !== undefined) === timed,
  );
  return exercise.sets.flatMap((set, setIndex) => {
    const old = sets[setIndex];
    if (set.done || !old) return [];
    const values =
      old.durationSec !== undefined
        ? { durationSec: old.durationSec }
        : { kg: old.kg ?? set.kg ?? null, reps: old.reps };
    return validSetValues(values, false)
      ? [{ type: 'editSet', setIndex, ...values }]
      : [];
  });
}

/** Prefill set drafts without marking them done. */
export function applyLastSets(
  session: ActiveTraining,
  previous: readonly SetRecord[],
  nowMs: number,
): ActiveTraining {
  if (session.training.phase === 'paused' || terminal(session.training))
    throw new Error('locked');
  const exercise = session.training.exercises[session.training.exerciseIndex];
  const edits = lastSetEdits(exercise, previous);
  if (edits.length === 0) return session;

  let training = session.training;
  for (const edit of edits) training = transitionTraining(training, edit).state;
  return {
    ...advanceClock(session, nowMs),
    training,
    revision: session.revision + 1,
  };
}

/** Strict restore boundary: never cast unknown storage directly into model state. */
export function restoreTraining(raw: unknown): ActiveTraining | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as ActiveTraining;
  if (
    s.v !== 1 ||
    !id(s.id) ||
    !id(s.workoutId) ||
    !id(s.title) ||
    !(s.sessionId === null || id(s.sessionId)) ||
    !validTime(s.clockMs) ||
    !validTime(s.elapsedMs) ||
    !validTime(s.restMs) ||
    !validTime(s.revision)
  )
    return null;
  const t = s.training;
  if (
    !t ||
    !['working', 'rest', 'paused', 'completed', 'stopped'].includes(t.phase) ||
    !['working', 'rest'].includes(t.pausedFrom) ||
    !Array.isArray(t.exercises) ||
    !t.exercises.length ||
    !Number.isInteger(t.exerciseIndex) ||
    t.exerciseIndex < 0 ||
    t.exerciseIndex >= t.exercises.length
  )
    return null;
  for (const ex of t.exercises) {
    if (
      !ex ||
      !id(ex.exerciseId) ||
      !Number.isSafeInteger(ex.restSec) ||
      ex.restSec < 0 ||
      (ex.targetReps !== undefined &&
        !validTarget(ex.targetReps)) ||
      !Array.isArray(ex.sets) ||
      !ex.sets.length
    )
      return null;
    const timed = isDurationTarget(ex.targetReps);
    for (const set of ex.sets) {
      if (
        !set ||
        typeof set.done !== 'boolean' ||
        (set.durationSec !== undefined && !timed) ||
        !validSetValues(set, set.done)
      )
        return null;
    }
  }
  if (terminal(t)) {
    if (
      typeof s.finishedAt !== 'string' ||
      !Number.isFinite(Date.parse(s.finishedAt)) ||
      Date.parse(s.finishedAt) !== s.clockMs
    )
      return null;
  } else if (s.finishedAt !== null) return null;
  if (
    t.phase !== 'rest' &&
    !(t.phase === 'paused' && t.pausedFrom === 'rest') &&
    s.restMs !== 0
  )
    return null;
  return JSON.parse(JSON.stringify(s)) as ActiveTraining;
}
