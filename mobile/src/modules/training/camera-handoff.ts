/** Owner: npdwuy. Camera hand-off for the Workout screen (#32, #33).
 *
 * The Workout screen opens the Camera route for one set and remembers which set
 * that was (a CameraTarget). When Camera returns `cameraReps` (see routes.ts),
 * the count fills that set's reps. The set is not completed automatically: the
 * user still checks kg/reps and taps Complete set, so the existing durable save
 * and Finish path stay the only way into history.
 *
 * Pure: no React, navigation or storage.
 */
import { actOnSession, type ActiveTraining } from './session-model';
import { isDurationTarget, type ExercisePlan } from './training-model';

/** The set a camera count belongs to, kept while the Camera screen is open. */
export type CameraTarget = Readonly<{
  trainingId: string;
  exerciseIndex: number;
  setIndex: number;
}>;

const MAX_REPS = 999;
const blocked = (session: ActiveTraining) =>
  session.finishedAt !== null ||
  session.training.phase === 'paused' ||
  session.training.phase === 'completed' ||
  session.training.phase === 'stopped';

/**
 * A number the Camera screen can show as its target. "8–12" gives 8 (the
 * minimum to reach); timed targets ("5 min") and missing targets give undefined.
 */
export function cameraTargetReps(target: ExercisePlan['targetReps']): number | undefined {
  if (typeof target === 'number') return Number.isInteger(target) && target > 0 ? target : undefined;
  if (typeof target !== 'string' || isDurationTarget(target)) return undefined;
  const first = /\d+/.exec(target);
  const reps = first ? Number(first[0]) : NaN;
  return reps >= 1 && reps <= MAX_REPS ? reps : undefined;
}

/** True when this exercise's sets record reps (not a duration). */
export const canCountWithCamera = (target: ExercisePlan['targetReps']): boolean =>
  !isDurationTarget(target);

/** The target for an unfinished rep set of the current exercise, or null if it can't use the camera. */
export function cameraTargetFor(
  session: ActiveTraining,
  setIndex: number,
): CameraTarget | null {
  if (blocked(session)) return null;
  const { exerciseIndex } = session.training;
  const exercise = session.training.exercises[exerciseIndex];
  const set = exercise?.sets[setIndex];
  if (!set || set.done || !canCountWithCamera(exercise.targetReps)) return null;
  return { trainingId: session.id, exerciseIndex, setIndex };
}

/**
 * Put a camera count into a set. Uses the remembered target when it still points at
 * an unfinished set of the current exercise; otherwise the first unfinished set
 * (for example after the app restarted while Camera was open). Keeps any kg the
 * user already entered. Throws a message the screen can show as-is.
 */
export function applyCameraReps(
  session: ActiveTraining,
  target: CameraTarget | null,
  reps: number,
  nowMs: number,
): ActiveTraining {
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS)
    throw new Error('The camera did not count any reps. Enter them by hand.');
  if (blocked(session))
    throw new Error('The workout is paused or finished, so the camera count was not added.');
  const { exerciseIndex, exercises } = session.training;
  const exercise = exercises[exerciseIndex];
  if (!canCountWithCamera(exercise.targetReps))
    throw new Error('This exercise records a duration, so the camera count was not added.');
  const remembered =
    target &&
    target.trainingId === session.id &&
    target.exerciseIndex === exerciseIndex &&
    exercise.sets[target.setIndex] &&
    !exercise.sets[target.setIndex].done
      ? target.setIndex
      : -1;
  const setIndex = remembered >= 0 ? remembered : exercise.sets.findIndex(set => !set.done);
  if (setIndex < 0)
    throw new Error('Every set of this exercise is done. Add a set to use the camera count.');
  const set = exercise.sets[setIndex];
  return actOnSession(
    session,
    { type: 'editSet', setIndex, kg: set.kg ?? null, reps },
    nowMs,
  );
}
