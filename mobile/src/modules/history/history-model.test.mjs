import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHistory, parseSetRecord, selectHistory, selectLastSets } from './history-model.ts';

// Test dependency, not a replacement for the project's shared date utility.
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const entry = (patch = {}) => ({
  id: 'hs-example', sessionId: null, workoutId: 'wk-example', date: '2026-11-17',
  durationSec: 60, stoppedByPain: false,
  sets: [{ exerciseId: 'push-up', kg: null, reps: 10 }], ...patch,
});

test('missing/corrupt history is safe, including null elements', () => {
  for (const data of [undefined, null, {}, 'bad', [null, 3, {}, entry({ date: '2026-02-30' })]]) {
    assert.deepEqual(parseHistory(data, isDate), []);
  }
});

test('bodyweight and decimal load are accepted; invalid numbers are rejected', () => {
  assert.deepEqual(parseSetRecord({ exerciseId: 'press', kg: 2.5, reps: 8 }),
    { exerciseId: 'press', kg: 2.5, reps: 8 });
  assert.ok(parseSetRecord({ exerciseId: 'push-up', kg: null, reps: 10 }));
  for (const patch of [{ kg: NaN }, { kg: Infinity }, { kg: -1 }, { reps: 1.5 },
    { reps: -1 }, { reps: '10' }, { exerciseId: '' }]) {
    assert.equal(parseSetRecord({ exerciseId: 'press', kg: 0, reps: 8, ...patch }), null);
  }
});

test('read boundary removes corrupt sets and normalizes optional history fields', () => {
  const data = entry({ durationSec: -3, sessionId: {}, stoppedByPain: 'yes',
    sets: [null, { exerciseId: 'press', kg: 4, reps: 8 }] });
  const [parsed] = parseHistory([data], isDate);
  assert.equal(parsed.durationSec, 0);
  assert.equal(parsed.sessionId, null);
  assert.equal(parsed.stoppedByPain, false);
  assert.equal(parsed.sets.length, 1);
});

test('filters combine and date bounds are inclusive', () => {
  const entries = [entry({ id: 'first', date: '2026-11-16' }), entry({ id: 'last' }),
    entry({ id: 'outside', date: '2026-11-18' }), entry({ workoutId: 'other' })];
  assert.deepEqual(selectHistory(entries, { from: '2026-11-16', to: '2026-11-17',
    workoutId: 'wk-example', exerciseId: 'push-up' }).map(h => h.id), ['last', 'first']);
  assert.deepEqual(selectHistory(entries, { from: '2026-11-18', to: '2026-11-16' }), []);
});

test('same-day order stays stable instead of sorting random IDs', () => {
  assert.deepEqual(selectHistory([entry({ id: 'hs-a' }), entry({ id: 'hs-z' })])
    .map(h => h.id), ['hs-a', 'hs-z']);
});

test('last sets come only from latest matching workout execution', () => {
  const entries = [entry({ date: '2026-11-16' }), entry({ sets: [
    { exerciseId: 'press', kg: 5, reps: 8 }, { exerciseId: 'push-up', kg: null, reps: 12 },
  ] })];
  assert.deepEqual(selectLastSets(entries, 'push-up'), [{ exerciseId: 'push-up', kg: null, reps: 12 }]);
  assert.deepEqual(selectLastSets(entries, 'missing'), []);
  assert.deepEqual(selectLastSets(entries, ''), []);
});

test('reads return detached data and never reorder the source', () => {
  const entries = [entry({ date: '2026-11-16' }), entry()];
  const before = structuredClone(entries);
  const selected = selectHistory(entries);
  selected[0].sets[0].reps = 99;
  selectLastSets(entries, 'push-up')[0].reps = 99;
  parseHistory(entries, isDate)[0].sets[0].reps = 99;
  assert.deepEqual(entries, before);
});
