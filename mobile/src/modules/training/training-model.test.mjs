import test from 'node:test';
import assert from 'node:assert/strict';
import { createTraining, transitionTraining, completedSets } from './training-model.ts';

const plan = [
  { exerciseId: 'push-up', setCount: 2, restSec: 60 },
  { exerciseId: 'press', setCount: 1, restSec: 0 },
];
const start = () => createTraining(plan);
function step(state, action) {
  const result = transitionTraining(state, action);
  assert.equal(result.ok, true, JSON.stringify(action));
  return result.state;
}
const edit = (state, kg = 0, reps = 10, setIndex = 0) =>
  step(state, { type: 'editSet', setIndex, kg, reps });
const complete = (state, setIndex = 0) => step(state, { type: 'completeSet', setIndex });
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

test('creates independent drafts from supplied exercise IDs, without catalog defaults', () => {
  const source = structuredClone(plan);
  const state = createTraining(source);
  source[0].exerciseId = 'changed';
  assert.equal(state.exercises[0].exerciseId, 'push-up');
  assert.deepEqual(state.exercises[0].sets, [
    { kg: null, reps: null, done: false }, { kg: null, reps: null, done: false },
  ]);
  assert.notEqual(state.exercises[0].sets[0], state.exercises[0].sets[1]);
});

test('rejects missing and invalid plans', () => {
  for (const invalid of [null, [], [null], [{ ...plan[0], exerciseId: '' }],
    [{ ...plan[0], setCount: 0 }], [{ ...plan[0], setCount: 1.5 }],
    [{ ...plan[0], restSec: -1 }], [{ ...plan[0], restSec: Infinity }]]) {
    assert.equal(createTraining(invalid), null);
  }
});

test('invalid numeric edits reject rather than silently clamp', () => {
  const state = freeze(start());
  for (const [kg, reps] of [[-1, 10], [Infinity, 10], [NaN, 10], [1001, 10],
    [0, 0], [0, -1], [0, 1.5], [0, 1000], ['5', 10], [0, '8']]) {
    const result = transitionTraining(state, { type: 'editSet', setIndex: 0, kg, reps });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalidValues');
    assert.equal(result.state, state);
  }
  assert.equal(edit(state, 2.75, 8).exercises[0].sets[0].kg, 2.75);
});

test('cannot complete a blank or partially entered set; zero kg is explicit bodyweight', () => {
  for (const state of [start(), edit(start(), null, 10), edit(start(), 0, null)]) {
    assert.equal(transitionTraining(state, { type: 'completeSet', setIndex: 0 }).ok, false);
  }
  assert.equal(complete(edit(start())).exercises[0].sets[0].done, true);
});

test('completing a set starts rest when another set or exercise remains', () => {
  let state = complete(edit(start()));
  assert.equal(state.phase, 'rest');
  state = step(state, { type: 'skipRest' });
  state = complete(edit(state, 0, 8, 1), 1);
  assert.equal(state.phase, 'rest'); // last set, but another exercise follows
  state = step(state, { type: 'skipRest' });
  state = step(state, { type: 'nextExercise' });
  assert.equal(complete(edit(state, 5, 8)).phase, 'working');
});

test('zero-rest multi-set exercise stays working', () => {
  const state = createTraining([{ ...plan[0], restSec: 0 }]);
  assert.equal(complete(edit(state)).phase, 'working');
});

test('completed set is locked until undone; undo retains values', () => {
  const state = complete(edit(start()));
  assert.equal(transitionTraining(state, { type: 'editSet', setIndex: 0, kg: 5, reps: 8 }).ok, false);
  assert.equal(transitionTraining(state, { type: 'completeSet', setIndex: 0 }).ok, false);
  const undone = step(state, { type: 'undoSet', setIndex: 0 });
  assert.equal(undone.phase, 'working');
  assert.deepEqual(undone.exercises[0].sets[0], { kg: 0, reps: 10, done: false });
  assert.deepEqual(completedSets(undone), []);
  assert.equal(edit(undone, 2, 8).exercises[0].sets[0].kg, 2);
});

test('pause locks workout actions and resume restores work or rest', () => {
  for (const state of [edit(start()), complete(edit(start()))]) {
    const paused = step(state, { type: 'pause' });
    for (const action of [{ type: 'editSet', setIndex: 0, kg: 0, reps: 10 },
      { type: 'completeSet', setIndex: 1 }, { type: 'undoSet', setIndex: 0 },
      { type: 'nextExercise' }, { type: 'skipRest' }]) {
      assert.equal(transitionTraining(paused, action).ok, false);
    }
    const resumed = step(paused, { type: 'resume' });
    assert.equal(resumed.phase, state.phase);
    assert.deepEqual(resumed.exercises, state.exercises);
  }
});

test('next exercise can skip pending sets without marking them complete', () => {
  const next = step(edit(start()), { type: 'nextExercise' });
  assert.equal(next.exerciseIndex, 1);
  assert.deepEqual(completedSets(next), []);
  assert.equal(transitionTraining(next, { type: 'nextExercise' }).ok, false);
});

test('pain stop preserves performed sets and cannot resume or finish as normal', () => {
  const stopped = step(complete(edit(start())), { type: 'stopByPain' });
  assert.equal(stopped.phase, 'stopped');
  assert.equal(completedSets(stopped).length, 1);
  for (const type of ['resume', 'finish', 'nextExercise', 'stopByPain']) {
    const result = transitionTraining(stopped, { type });
    assert.equal(result.ok, false);
    assert.equal(result.state, stopped);
  }
  assert.equal(step(step(start(), { type: 'pause' }), { type: 'stopByPain' }).phase, 'stopped');
});

test('finish retains partial results and terminal state rejects repeat operations', () => {
  const finished = step(complete(edit(start())), { type: 'finish' });
  assert.equal(finished.phase, 'completed');
  assert.equal(completedSets(finished).length, 1);
  for (const type of ['finish', 'pause', 'resume', 'nextExercise', 'stopByPain']) {
    assert.equal(transitionTraining(finished, { type }).ok, false);
  }
  assert.deepEqual(completedSets(step(start(), { type: 'finish' })), []);
});

test('rejects invalid indices and transitions without mutation', () => {
  const state = freeze(start());
  for (const setIndex of [-1, 2, 0.5, NaN]) {
    const result = transitionTraining(state, { type: 'completeSet', setIndex });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalidSet');
    assert.equal(result.state, state);
  }
  for (const action of [{ type: 'resume' }, { type: 'skipRest' }, { type: 'undoSet', setIndex: 0 }]) {
    assert.equal(transitionTraining(state, action).ok, false);
  }
});

test('full workout flow exports only performed sets with shared IDs', () => {
  const original = freeze(start());
  let state = complete(edit(original, 0, 10));
  state = step(state, { type: 'pause' });
  state = step(state, { type: 'resume' });
  state = step(state, { type: 'skipRest' });
  state = complete(edit(state, 0, 8, 1), 1);
  state = step(state, { type: 'nextExercise' });
  state = complete(edit(state, 7.5, 8));
  state = step(state, { type: 'finish' });
  const sets = completedSets(state);
  assert.deepEqual(sets, [
    { exerciseId: 'push-up', kg: 0, reps: 10 },
    { exerciseId: 'push-up', kg: 0, reps: 8 },
    { exerciseId: 'press', kg: 7.5, reps: 8 },
  ]);
  sets[0].reps = 99;
  assert.equal(completedSets(state)[0].reps, 10);
  assert.deepEqual(completedSets(original), []);
});

test('adding a set preserves existing results, other exercises and the current phase', () => {
  for (const source of [start(), complete(edit(start())),
    step(start(), { type: 'nextExercise' })]) {
    const state = freeze(source);
    const before = structuredClone(state);
    const next = step(state, { type: 'addSet' });
    const index = state.exerciseIndex;
    assert.equal(next.phase, state.phase);
    assert.equal(next.exerciseIndex, index);
    assert.deepEqual(next.exercises[index].sets, [
      ...state.exercises[index].sets, { kg: null, reps: null, done: false },
    ]);
    assert.deepEqual(next.exercises[1 - index], state.exercises[1 - index]);
    assert.deepEqual(completedSets(next), completedSets(state));
    assert.deepEqual(state, before);
    const twice = step(next, { type: 'addSet' });
    assert.notEqual(twice.exercises[index].sets.at(-1), twice.exercises[index].sets.at(-2));
  }
});

test('adding a set is locked during pause and after finish or pain stop', () => {
  for (const action of ['pause', 'finish', 'stopByPain']) {
    const state = freeze(step(complete(edit(start())), { type: action }));
    const result = transitionTraining(state, { type: 'addSet' });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'locked');
    assert.equal(result.state, state);
  }
});

test('an added set needs explicit values and joins history only after completion', () => {
  let state = createTraining([{ exerciseId: 'push-up', setCount: 1, restSec: 60 }]);
  state = complete(edit(state));
  state = step(state, { type: 'addSet' });
  assert.equal(transitionTraining(state, { type: 'completeSet', setIndex: 1 }).ok, false);
  assert.equal(completedSets(state).length, 1);
  state = step(state, { type: 'addSet' });
  state = complete(edit(state, 0, 7, 1), 1);
  assert.equal(state.phase, 'rest');
  state = step(state, { type: 'finish' });
  assert.deepEqual(completedSets(state), [
    { exerciseId: 'push-up', kg: 0, reps: 10 },
    { exerciseId: 'push-up', kg: 0, reps: 7 },
  ]);
});
