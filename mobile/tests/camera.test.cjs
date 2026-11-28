const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const camera = require(join(
  process.env.FITLENS_TEST_BUILD,
  'modules/training/camera-handoff.js',
));
const m = require(join(
  process.env.FITLENS_TEST_BUILD,
  'modules/training/session-model.js',
));

const start = (targetReps = '8–12') =>
  m.startTraining(
    {
      id: 'hs-camera',
      workoutId: 'wk-legs',
      sessionId: null,
      title: 'Legs',
      plan: [
        { exerciseId: 'goblet-squat', setCount: 2, restSec: 60, targetReps },
        { exerciseId: 'easy-walking-warm-up', setCount: 1, restSec: 0, targetReps: '5 min' },
      ],
    },
    1000,
  );
const act = (s, action, now = 2000) => m.actOnSession(s, action, now);

test('target reps: lower bound of a range, whole numbers, nothing for timed or blank targets', () => {
  assert.equal(camera.cameraTargetReps('8–12'), 8);
  assert.equal(camera.cameraTargetReps('10-15 reps'), 10);
  assert.equal(camera.cameraTargetReps(12), 12);
  assert.equal(camera.cameraTargetReps('5 min'), undefined);
  assert.equal(camera.cameraTargetReps('1:30'), undefined);
  assert.equal(camera.cameraTargetReps('to failure'), undefined);
  assert.equal(camera.cameraTargetReps(undefined), undefined);
});

test('a camera count fills the remembered set, keeps its kg and does not complete it', () => {
  let s = act(start(), { type: 'editSet', setIndex: 1, kg: 16, reps: null });
  const target = camera.cameraTargetFor(s, 1);
  assert.deepEqual(target, { trainingId: 'hs-camera', exerciseIndex: 0, setIndex: 1 });
  const next = camera.applyCameraReps(s, target, 11, 9000);
  assert.deepEqual(next.training.exercises[0].sets[1], { kg: 16, reps: 11, done: false });
  assert.deepEqual(next.training.exercises[0].sets[0], s.training.exercises[0].sets[0]);
  assert.equal(next.id, s.id);
  assert.equal(next.revision, s.revision + 1);
  assert.equal(next.elapsedMs, s.elapsedMs + 7000); // time spent on Camera still counts
});

test('without a usable target the count goes to the first unfinished set', () => {
  let s = act(start(), { type: 'editSet', setIndex: 0, kg: 0, reps: 10 });
  s = act(s, { type: 'completeSet', setIndex: 0 });
  const stale = { trainingId: 'another-workout', exerciseIndex: 0, setIndex: 0 };
  for (const target of [null, stale, { trainingId: 'hs-camera', exerciseIndex: 0, setIndex: 0 }]) {
    const next = camera.applyCameraReps(s, target, 9, 3000);
    assert.deepEqual(next.training.exercises[0].sets[1], { kg: null, reps: 9, done: false });
    assert.equal(next.training.exercises[0].sets[0].done, true);
  }
});

test('invalid counts and blocked states change nothing and explain why', () => {
  const s = start();
  const target = camera.cameraTargetFor(s, 0);
  for (const reps of [0, -1, 2.5, 1000, NaN]) {
    assert.throws(() => camera.applyCameraReps(s, target, reps, 2000), /did not count any reps/);
  }
  const paused = act(s, { type: 'pause' });
  assert.equal(camera.cameraTargetFor(paused, 0), null);
  assert.throws(() => camera.applyCameraReps(paused, target, 10, 2000), /paused or finished/);
  const stopped = act(s, { type: 'stopByPain' });
  assert.equal(camera.cameraTargetFor(stopped, 0), null);
  assert.throws(() => camera.applyCameraReps(stopped, target, 10, 2000), /paused or finished/);
  assert.deepEqual(s.training.exercises[0].sets[0], { kg: null, reps: null, done: false });
});

test('done and timed sets cannot take a camera count', () => {
  let s = act(start(), { type: 'editSet', setIndex: 0, kg: 0, reps: 8 });
  s = act(s, { type: 'completeSet', setIndex: 0 });
  assert.equal(camera.cameraTargetFor(s, 0), null);
  assert.equal(camera.cameraTargetFor(s, 5), null);
  s = act(s, { type: 'editSet', setIndex: 1, kg: 0, reps: 8 });
  s = act(s, { type: 'completeSet', setIndex: 1 });
  assert.throws(() => camera.applyCameraReps(s, null, 10, 2000), /Every set of this exercise is done/);
  const walking = act(s, { type: 'nextExercise' });
  assert.equal(walking.training.exerciseIndex, 1);
  assert.equal(camera.cameraTargetFor(walking, 0), null);
  assert.throws(() => camera.applyCameraReps(walking, null, 10, 2000), /records a duration/);
});
