const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const load = p => require(join(process.env.FITLENS_TEST_BUILD, p));
const { hydrate, KEYS } = load('shared/storage.js');
const h = load('modules/history/history.js');
const { buildReview } = load('modules/checkin/review-model.js');
function device() {
  const disk = new Map();
  return {
    disk,
    loadAll: async () => [...disk],
    save: async (k, v) => disk.set(k, v),
    remove: async () => {},
  };
}
function entry(id = 'hs-a', at = '2026-11-19T02:00:00.000Z') {
  return {
    id,
    sessionId: null,
    workoutId: 'tpl-upper',
    date: '2026-11-19',
    durationSec: 15,
    stoppedByPain: false,
    sets: [{ exerciseId: 'push-up', kg: 0, reps: 10 }],
    completedAt: at,
  };
}
test('concurrent completions retain separate same-day sessions and retry creates no duplicate', async () => {
  const p = device();
  await hydrate(p);
  const a = entry('hs-z'),
    b = entry('hs-a', '2026-11-19T03:00:00.000Z');
  b.sets[0].reps = 6;
  await Promise.all([h.saveHistory(a), h.saveHistory(b)]);
  await h.saveHistory(a);
  await hydrate(p);
  assert.deepEqual(
    h.getHistory().map(x => x.id),
    ['hs-a', 'hs-z'],
  );
  assert.equal(h.getLastSets('push-up')[0].reps, 6);
  assert.equal(
    h.getHistory({
      from: '2026-11-19',
      to: '2026-11-19',
      exerciseId: 'push-up',
    }).length,
    2,
  );
  assert.equal(h.getHistory({ workoutId: 'missing' }).length, 0);
  const copy = h.getHistory();
  copy[0].sets[0].reps = 999;
  assert.equal(h.getLastSets('push-up')[0].reps, 6);
  await assert.rejects(
    h.saveHistory({ ...a, durationSec: 999 }),
    /different result/,
  );
});
test('new completions reject legacy-permissive values; empty pain stop is retained', async () => {
  const p = device();
  await hydrate(p);
  for (const bad of [
    { ...entry(), sets: [] },
    { ...entry(), sets: [{ exerciseId: 'push-up', kg: null, reps: 0 }] },
    { ...entry(), durationSec: -1 },
    { ...entry(), completedAt: 'bad' },
  ])
    await assert.rejects(h.saveHistory(bad));
  assert.equal(p.disk.size, 0);
  await h.saveHistory({ ...entry(), stoppedByPain: true, sets: [] });
  assert.equal(h.getHistory()[0].stoppedByPain, true);
});
test('retry enriches an older completed checkpoint without duplicates or overwriting its metadata', async () => {
  const p = device();
  await hydrate(p);
  const original = { ...entry(), stoppedByPain: true };
  await h.saveHistory(original);
  await hydrate(p);

  const retried = { ...original, workoutTitle: 'Original title', stoppedExerciseId: 'bench-press' };
  assert.deepEqual(await h.saveHistory(retried), retried);
  assert.deepEqual(await h.saveHistory(original), retried);
  await assert.rejects(h.saveHistory({ ...retried, workoutTitle: 'New title' }), /different result/);
  await assert.rejects(h.saveHistory({ ...retried, stoppedExerciseId: 'push-up' }), /different result/);
  await hydrate(p);
  assert.deepEqual(h.getHistory(), [retried]);
});
test('failed history save keeps cache and disk unchanged; retry is durable', async () => {
  const p = device();
  await hydrate(p);
  const save = p.save;
  p.save = async () => {
    throw Error('full');
  };
  await assert.rejects(h.saveHistory(entry()), /full/);
  assert.deepEqual(h.getHistory(), []);
  p.save = save;
  await h.saveHistory(entry());
  await hydrate(p);
  assert.equal(h.getHistory().length, 1);
});
test('reviews replace by history ID, survive reload and detach nested results', async () => {
  const p = device();
  await hydrate(p);
  await h.saveHistory(entry());
  const make = note =>
    buildReview(
      {
        historyId: 'hs-a',
        rpe: 5,
        discomfort: [
          { region: 'knees', sensation: 'pain', exerciseId: 'push-up' },
        ],
        scores: { 'push-up': 10 },
        note,
      },
      new Date('2026-11-19T03:00:00Z'),
    );
  await h.appendReviewDurable(make('first'));
  await h.appendReviewDurable(make('second'));
  await hydrate(p);
  assert.equal(h.getReviews().length, 1);
  assert.equal(h.getReview('hs-a').note, 'second');
  const result = h.getReview('hs-a');
  result.discomfort[0].region = 'wrists';
  assert.equal(h.getReview('hs-a').discomfort[0].region, 'knees');
  assert.equal(
    h.getReviews({ from: '2026-11-19', to: '2026-11-19' }).length,
    1,
  );
  await assert.rejects(
    h.appendReviewDurable({ ...make('orphan'), historyId: 'missing' }),
  );
  const save = p.save;
  p.save = async () => {
    throw Error('disk');
  };
  await assert.rejects(h.appendReviewDurable(make('lost')));
  assert.equal(h.getReview('hs-a').note, 'second');
  p.save = save;
});
test('legacy seed and readers remain compatible without timestamps', async () => {
  const p = device();
  await hydrate(p);
  h.seedHistory('2026-11-19', '2026-11-16');
  const histories = h.getHistory();
  assert.equal(histories.length, 20);
  assert.equal(histories[0].date, '2026-11-18');
  // Caller mutations never alter storage, and malformed set rows are filtered.
  p.disk.set(
    KEYS.history,
    JSON.stringify({
      v: 1,
      data: [
        {
          ...entry(),
          sets: [null, { exerciseId: 'push-up', kg: null, reps: 0 }],
        },
      ],
    }),
  );
  await hydrate(p);
  assert.equal(h.getHistory()[0].sets.length, 1);
});
