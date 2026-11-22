const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const m = require(join(
  process.env.FITLENS_TEST_BUILD,
  'modules/training/session-model.js',
));
const { completedSets } = require(join(
  process.env.FITLENS_TEST_BUILD,
  'modules/training/training-model.js',
));
const start = () =>
  m.startTraining(
    {
      id: 'hs-one',
      workoutId: 'wk-one',
      sessionId: null,
      title: 'My workout',
      plan: [{ exerciseId: 'push-up', setCount: 2, restSec: 60 }],
    },
    1000,
  );
const act = (s, type, now = 1000, extra = {}) =>
  m.actOnSession(s, { type, ...extra }, now);
const rest = () =>
  act(
    act(start(), 'editSet', 1000, { setIndex: 0, kg: 0, reps: 10 }),
    'completeSet',
    5000,
    { setIndex: 0 },
  );
test('legacy timed snapshots preserve recorded reps while unfinished sets accept duration', () => {
  const legacy = start();
  const exercise = legacy.training.exercises[0];
  exercise.targetReps = '5 min';
  exercise.sets[0] = { kg: 0, reps: 20, done: true };
  const restored = m.restoreTraining(legacy);
  assert.deepEqual(restored.training.exercises[0].sets, exercise.sets);

  const edited = act(restored, 'editSet', 1000, { setIndex: 1, durationSec: 285 });
  const completed = act(edited, 'completeSet', 1000, { setIndex: 1 });
  assert.deepEqual(completedSets(m.restoreTraining(completed).training), [
    { exerciseId: 'push-up', kg: 0, reps: 20 },
    { exerciseId: 'push-up', durationSec: 285 },
  ]);
});
test('clock counts real elapsed time across background, without tick dependence', () => {
  const s = rest();
  const later = m.advanceClock(s, 35000);
  assert.equal(later.elapsedMs, 34000);
  assert.equal(later.restMs, 30000);
  const done = m.advanceClock(later, 90000);
  assert.equal(done.restMs, 0);
  assert.equal(done.training.phase, 'rest');
  assert.equal(completedSets(done.training).length, 1);
  assert.deepEqual(m.advanceClock(s, -1), s);
  assert.equal(m.advanceClock(later, 10000).elapsedMs, 34000);
});
test('pause freezes both timers and resume retains the remaining rest', () => {
  const paused = act(rest(), 'pause', 15000);
  assert.equal(paused.restMs, 50000);
  const resumed = act(paused, 'resume', 115000);
  assert.equal(resumed.elapsedMs, 14000);
  assert.equal(resumed.restMs, 50000);
  const next = m.advanceClock(resumed, 125000);
  assert.equal(next.elapsedMs, 24000);
  assert.equal(next.restMs, 40000);
  assert.throws(() => m.extendRest(paused, 15, 20000));
  const extended = m.extendRest(next, 15, 130000);
  assert.equal(extended.restMs, 50000);
  assert.equal(act(extended, 'skipRest', 130000).restMs, 0);
});
test('terminal snapshot keeps its completion time on remount and cannot restart timers', () => {
  for (const type of ['finish', 'stopByPain']) {
    const finished = act(rest(), type, 15000);
    const advanced = m.advanceClock(finished, 90000);
    assert.equal(advanced.elapsedMs, 14000);
    assert.equal(advanced.finishedAt, new Date(15000).toISOString());
    assert.deepEqual(m.restoreTraining(advanced), finished);
    assert.throws(() => act(finished, 'addSet', 90000));
  }
});
test('restore rejects malformed and inconsistent snapshots; accepted snapshots detach', () => {
  const good = rest();
  assert.deepEqual(m.restoreTraining(good), good);
  const invalid = [
    null,
    {},
    { ...good, v: 2 },
    { ...good, clockMs: NaN },
    { ...good, elapsedMs: -1 },
    { ...good, finishedAt: 'bad' },
    { ...good, training: { ...good.training, exerciseIndex: 10 } },
    { ...good, training: { ...good.training, phase: 'unknown' } },
    { ...good, training: { ...good.training, exercises: [] } },
    {
      ...good,
      training: {
        ...good.training,
        exercises: [
          {
            ...good.training.exercises[0],
            sets: [{ kg: null, reps: 10, done: true }],
          },
        ],
      },
    },
    { ...start(), restMs: 1000 },
  ];
  for (const bad of invalid) assert.equal(m.restoreTraining(bad), null);
  const restored = m.restoreTraining(good);
  restored.training.exercises[0].sets[0].reps = 5;
  assert.equal(good.training.exercises[0].sets[0].reps, 10);
});
test('Use last time preserves completed sets, maps by order and never completes drafts', () => {
  const s = rest();
  const original = JSON.stringify(s);
  const next = m.applyLastSets(
    s,
    [
      { exerciseId: 'other', kg: 99, reps: 99 },
      { exerciseId: 'push-up', kg: 5, reps: 8 },
      { exerciseId: 'push-up', kg: 0, reps: 7 },
      { exerciseId: 'push-up', kg: 0, reps: 6 },
    ],
    7000,
  );
  assert.equal(next.training.exercises[0].sets.length, 2);
  assert.deepEqual(next.training.exercises[0].sets, [
    { kg: 0, reps: 10, done: true },
    { kg: 0, reps: 7, done: false },
  ]);
  assert.equal(completedSets(next.training).length, 1);
  assert.equal(JSON.stringify(s), original);
  assert.throws(() => m.applyLastSets(act(s, 'pause', 7000), [], 8000));
  assert.throws(() => m.applyLastSets(act(s, 'finish', 7000), [], 8000));
  assert.equal(
    m.applyLastSets(
      start(),
      [{ exerciseId: 'push-up', kg: null, reps: 0 }],
      1000,
    ).training.exercises[0].sets[0].kg,
    null,
  );
});
test('restored sessions produce the same result as uninterrupted actions', () => {
  let s = rest();
  const copy = m.restoreTraining(JSON.parse(JSON.stringify(s)));
  const finish = s =>
    act(
      act(act(s, 'skipRest', 70000), 'editSet', 71000, {
        setIndex: 1,
        kg: 0,
        reps: 8,
      }),
      'completeSet',
      72000,
      { setIndex: 1 },
    );
  assert.deepEqual(finish(copy), finish(s));
});

test('workout targets survive a snapshot but never count as performed reps', () => {
  const input = {
    id: 'hs-target',
    workoutId: 'wk-one',
    sessionId: null,
    title: 'Target',
    plan: [{ exerciseId: 'push-up', setCount: 2, restSec: 60, targetReps: 12 }],
  };
  const s = m.startTraining(input, 1000);
  assert.equal(s.training.exercises[0].targetReps, 12);
  assert.deepEqual(completedSets(s.training), []);
  assert.equal(s.training.exercises[0].sets[0].reps, null);
  assert.equal(m.restoreTraining(s).training.exercises[0].targetReps, 12);
  assert.equal(
    m.startTraining(
      { ...input, plan: [{ ...input.plan[0], targetReps: 0 }] },
      1000,
    ),
    null,
  );
});
