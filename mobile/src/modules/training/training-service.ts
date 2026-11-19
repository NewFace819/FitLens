import { toDateKey } from '../../shared/dates';
import { newId } from '../../shared/ids';
import { KEYS, read, updateDurable } from '../../shared/storage';
import { saveHistory, type HistoryEntry } from '../history/history';
import { getExercise } from '../workouts/exercises';
import {
  getWorkout,
  getSession,
  markSessionDoneDurable,
} from '../workouts/schedule';
import { completedSets } from './training-model';
import {
  restoreTraining,
  startTraining,
  type ActiveTraining,
} from './session-model';

export function getActiveTraining(): ActiveTraining | null {
  const raw = read<unknown>(KEYS.activeTraining, null);
  if (raw === null) return null;
  const session = restoreTraining(raw);
  if (!session)
    throw new Error(
      'The saved workout needs recovery. Its data has been kept.',
    );
  return session;
}

export async function saveActiveTraining(
  session: ActiveTraining,
): Promise<ActiveTraining> {
  const valid = restoreTraining(session);
  if (!valid) throw new Error('Invalid workout snapshot.');
  return updateDurable(KEYS.activeTraining, raw => {
    const previous = raw == null ? null : restoreTraining(raw);
    if (raw != null && !previous)
      throw new Error('Saved workout needs recovery.');
    if (
      previous &&
      (previous.id !== valid.id ||
        previous.workoutId !== valid.workoutId ||
        previous.sessionId !== valid.sessionId ||
        previous.revision > valid.revision ||
        (previous.revision === valid.revision &&
          JSON.stringify(previous) !== JSON.stringify(valid)) ||
        (previous.finishedAt !== null &&
          JSON.stringify(previous) !== JSON.stringify(valid)))
    ) {
      throw new Error('A newer workout snapshot is already saved.');
    }
    return valid;
  });
}

export async function beginWorkout(
  params: { workout?: string; session?: string },
  restSec?: number,
  nowMs = Date.now(),
): Promise<ActiveTraining> {
  if (getActiveTraining())
    throw new Error('Resume or discard the current workout first.');
  if (restSec !== undefined && (!Number.isInteger(restSec) || restSec < 0 || restSec > 3600))
    throw new Error('Choose a rest time from 0 to 3600 seconds.');
  const scheduled = params.session ? getSession(params.session) : null;
  if (params.session && !scheduled)
    throw new Error('Scheduled session no longer exists.');
  if (scheduled && params.workout && params.workout !== scheduled.workoutId)
    throw new Error('Workout and schedule do not match.');
  const workout = getWorkout(scheduled?.workoutId ?? params.workout ?? '');
  if (!workout || workout.items.some(item => !getExercise(item.exerciseId)))
    throw new Error('Workout is unavailable.');
  const session = startTraining(
    {
      id: newId('hs'),
      workoutId: workout.id,
      sessionId: scheduled?.id ?? null,
      title: workout.title,
      plan: workout.items.map(item => ({
        exerciseId: item.exerciseId,
        setCount: item.sets,
        restSec: restSec ?? item.rest,
        targetReps: item.reps,
      })),
    },
    nowMs,
  );
  if (!session) throw new Error('Workout plan is invalid.');
  return saveActiveTraining(session);
}

/** Call only after explicit user confirmation. Does not erase history/reviews. */
export async function discardTraining(id: string): Promise<void> {
  await updateDurable(KEYS.activeTraining, raw => {
    const current = raw == null ? null : restoreTraining(raw);
    if (
      raw != null &&
      (!current || current.id !== id || current.finishedAt !== null)
    ) {
      throw new Error(
        'Cannot discard this workout. Retry saving its result instead.',
      );
    }
    return null;
  });
}

export type Completion = {
  history: HistoryEntry | null;
  missingSession: boolean;
};
const completing = new Map<string, Promise<Completion>>();

/** Durable checkpoint → history → schedule → clear. Every step is safe to retry. */
export function completeWorkout(session: ActiveTraining): Promise<Completion> {
  const running = completing.get(session.id);
  if (running) return running;
  const operation = finish(session);
  completing.set(session.id, operation);
  operation.finally(() => completing.delete(session.id)).catch(() => undefined);
  return operation;
}

async function finish(session: ActiveTraining): Promise<Completion> {
  const valid = restoreTraining(session);
  if (!valid || !valid.finishedAt)
    throw new Error('Finish the workout before saving its result.');
  await saveActiveTraining(valid);
  const sets = completedSets(valid.training);
  let history: HistoryEntry | null = null;
  let missingSession = false;
  if (sets.length || valid.training.phase === 'stopped') {
    history = await saveHistory({
      id: valid.id,
      workoutId: valid.workoutId,
      sessionId: valid.sessionId,
      date: toDateKey(new Date(valid.finishedAt)),
      durationSec: Math.floor(valid.elapsedMs / 1000),
      stoppedByPain: valid.training.phase === 'stopped',
      sets,
      completedAt: valid.finishedAt,
    });
    if (valid.sessionId)
      missingSession = (await markSessionDoneDurable(valid.sessionId)) === null;
  }
  await updateDurable(KEYS.activeTraining, raw => {
    const current = restoreTraining(raw);
    if (raw != null && (!current || current.id !== valid.id))
      throw new Error('The active workout changed. Its data has been kept.');
    return null;
  });
  return { history, missingSession };
}
