/** Pure clock + resumable workout snapshot. Background time counts; explicit pause freezes time. */
import {
  createTraining,
  validTarget,
  transitionTraining,
  type TrainingState,
  type TrainingAction,
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

/** Fill only unfinished rows by order. Missing/legacy values stay blank, never mark done. */
export function applyLastSets(
  session: ActiveTraining,
  previous: readonly SetRecord[],
  nowMs: number,
): ActiveTraining {
  if (session.training.phase === 'paused' || terminal(session.training))
    throw new Error('locked');
  let next = advanceClock(session, nowMs);
  const exercise = next.training.exercises[next.training.exerciseIndex];
  const sets = previous.filter(s => s.exerciseId === exercise.exerciseId);
  exercise.sets.forEach((set, setIndex) => {
    const old = sets[setIndex];
    if (set.done || !old || old.kg === null) return;
    const result = transitionTraining(next.training, {
      type: 'editSet',
      setIndex,
      kg: old.kg,
      reps: old.reps,
    });
    if (result.ok) next = { ...next, training: result.state };
  });
  return { ...next, revision: session.revision + 1 };
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
    for (const set of ex.sets) {
      if (
        !set ||
        typeof set.done !== 'boolean' ||
        !(
          set.kg === null ||
          (typeof set.kg === 'number' &&
            Number.isFinite(set.kg) &&
            set.kg >= 0 &&
            set.kg <= 1000)
        ) ||
        !(
          set.reps === null ||
          (Number.isInteger(set.reps) && set.reps >= 1 && set.reps <= 999)
        ) ||
        (set.done && (set.kg === null || set.reps === null))
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
