const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const load = p => require(join(process.env.FITLENS_TEST_BUILD, p));
const storage = load('shared/storage.js'),
  service = load('modules/training/training-service.js'),
  model = load('modules/training/session-model.js');
const history = load('modules/history/history.js'),
  workouts = load('modules/workouts/schedule.js');
const { getCheckInContext, submitCheckIn, submitCheckInDurable } = load(
  'modules/checkin/checkin.js',
);
const { getRhythm } = load('modules/rhythm/rhythm.js');
const now = new Date(2026, 10, 19, 10).getTime();
function device() {
  const disk = new Map();
  return {
    disk,
    loadAll: async () => [...disk],
    save: async (k, v) => disk.set(k, v),
    remove: async keys => keys.forEach(k => disk.delete(k)),
  };
}
async function setup() {
  const p = device();
  await storage.hydrate(p);
  workouts.seedSchedule('2026-11-19', '2026-11-16');
  await storage.writeDurable('fitlens.barrier', true);
  return p;
}
function done(s, pain = false) {
  s = model.actOnSession(
    s,
    { type: 'editSet', setIndex: 0, kg: 0, reps: 8 },
    now + 1000,
  );
  s = model.actOnSession(s, { type: 'completeSet', setIndex: 0 }, now + 2000);
  return model.actOnSession(
    s,
    { type: pain ? 'stopByPain' : 'finish' },
    now + 3000,
  );
}

test('real module flow: scheduled workout to history, schedule, check-in and rhythm', async () => {
  const p = await setup();
  const active = await service.beginWorkout({ session: 'ss-seed04' }, 60, now);
  const result = await service.completeWorkout(done(active));
  assert.equal(result.history.sessionId, 'ss-seed04');
  assert.equal(workouts.getSession('ss-seed04').status, 'done');
  assert.equal(service.getActiveTraining(), null);
  assert.equal(getCheckInContext(active.id).entry.id, active.id);
  submitCheckIn(
    { historyId: active.id, rpe: 5, discomfort: [], scores: {}, note: 'ok' },
    false,
    new Date(now),
  );
  await storage.writeDurable('fitlens.barrier', true);
  await storage.hydrate(p);
  assert.equal(history.getHistory().length, 1);
  assert.equal(history.getReview(active.id).note, 'ok');
  assert.equal(getRhythm('2026-11-19').thisWeek.length, 1);
});
test('free workouts use null session, concurrent Finish calls share one operation', async () => {
  await setup();
  const active = await service.beginWorkout({ workout: 'tpl-upper' }, 30, now);
  const completed = done(active);
  const a = service.completeWorkout(completed),
    b = service.completeWorkout(completed);
  assert.equal(a, b);
  await a;
  assert.equal(history.getHistory().length, 1);
  assert.equal(history.getHistory()[0].sessionId, null);
});
test('every completion failure keeps a recoverable snapshot; reload/retry never duplicates', async () => {
  for (const failure of ['checkpoint', 'history', 'schedule', 'clear']) {
    const p = await setup();
    const active = await service.beginWorkout(
      { session: 'ss-seed04' },
      60,
      now,
    );
    const completed = done(active);
    const save = p.save;
    p.save = async (k, v) => {
      const data = JSON.parse(v).data;
      if (
        (failure === 'checkpoint' &&
          k === storage.KEYS.activeTraining &&
          data !== null) ||
        (failure === 'history' && k === storage.KEYS.history) ||
        (failure === 'schedule' && k === storage.KEYS.sessions) ||
        (failure === 'clear' &&
          k === storage.KEYS.activeTraining &&
          data === null)
      )
        throw Error(failure);
      await save(k, v);
    };
    await assert.rejects(
      service.completeWorkout(completed),
      new RegExp(failure),
    );
    assert.ok(service.getActiveTraining());
    if (failure === 'checkpoint' || failure === 'history')
      assert.equal(workouts.getSession('ss-seed04').status, 'planned');
    p.save = save;
    await storage.hydrate(p);
    // If the checkpoint itself failed, only the previous acknowledged draft survives a crash.
    const recover =
      failure === 'checkpoint' ? completed : service.getActiveTraining();
    await service.completeWorkout(recover);
    await storage.hydrate(p);
    assert.equal(history.getHistory().length, 1, failure);
    assert.equal(service.getActiveTraining(), null, failure);
    assert.equal(workouts.getSession('ss-seed04').status, 'done', failure);
  }
});
test('ordinary empty finish skips history and schedule; pain stop keeps an empty flagged entry', async () => {
  await setup();
  let active = await service.beginWorkout({ session: 'ss-seed04' }, 60, now);
  let result = await service.completeWorkout(
    model.actOnSession(active, { type: 'finish' }, now + 1000),
  );
  assert.equal(result.history, null);
  assert.equal(workouts.getSession('ss-seed04').status, 'planned');
  active = await service.beginWorkout({ session: 'ss-seed04' }, 60, now + 2000);
  result = await service.completeWorkout(
    model.actOnSession(active, { type: 'stopByPain' }, now + 3000),
  );
  assert.equal(result.history.stoppedByPain, true);
  assert.deepEqual(result.history.sets, []);
  assert.equal(workouts.getSession('ss-seed04').status, 'done');
});
test('invalid starts, duplicate active sessions and stale checkpoints do not overwrite data', async () => {
  await setup();
  for (const params of [
    {},
    { workout: 'bad' },
    { session: 'bad' },
    { session: 'ss-seed04', workout: 'tpl-upper' },
  ])
    await assert.rejects(service.beginWorkout(params, 60, now));
  const active = await service.beginWorkout({ workout: 'tpl-upper' }, 60, now);
  await assert.rejects(service.beginWorkout({ workout: 'tpl-lower' }, 60, now));
  const newer = model.actOnSession(active, { type: 'addSet' }, now + 1000);
  await service.saveActiveTraining(newer);
  await assert.rejects(service.saveActiveTraining(active));
  assert.equal(service.getActiveTraining().revision, 1);
  await assert.rejects(service.discardTraining('wrong-id'));
  await service.discardTraining(active.id);
  assert.equal(service.getActiveTraining(), null);
});
test('deleted schedule does not delete completed results or prevent check-in', async () => {
  await setup();
  const active = await service.beginWorkout({ session: 'ss-seed04' }, 60, now);
  await storage.writeDurable(storage.KEYS.sessions, []);
  const result = await service.completeWorkout(done(active, true));
  assert.equal(result.missingSession, true);
  assert.equal(getCheckInContext(active.id).entry.stoppedByPain, true);
});
test('malformed stored active session is kept for recovery and cannot be replaced', async () => {
  const p = await setup();
  await storage.writeDurable(storage.KEYS.activeTraining, {
    v: 99,
    important: 'keep',
  });
  assert.throws(() => service.getActiveTraining(), /recovery/);
  await assert.rejects(service.beginWorkout({ workout: 'tpl-upper' }, 60, now));
  await storage.hydrate(p);
  assert.deepEqual(storage.read(storage.KEYS.activeTraining, null), {
    v: 99,
    important: 'keep',
  });
});

test('durable check-in waits for storage and exposes failure without a saved review', async () => {
  const p = await setup();
  const active = await service.beginWorkout({ workout: 'tpl-upper' }, 60, now);
  await service.completeWorkout(done(active));
  assert.equal(getCheckInContext(active.id).setCount, 1);
  assert.equal(getCheckInContext(active.id).exercises.length, 1);
  const save = p.save;
  p.save = async (k, v) => {
    if (k === storage.KEYS.reviews) throw Error('review failure');
    await save(k, v);
  };
  const draft = {
    historyId: active.id,
    rpe: 8,
    discomfort: [],
    scores: {},
    note: 'durable',
  };
  await assert.rejects(
    submitCheckInDurable(draft, false, new Date(now)),
    /review failure/,
  );
  assert.equal(history.getReview(active.id), null);
  p.save = save;
  await submitCheckInDurable(draft, false, new Date(now));
  await storage.hydrate(p);
  assert.equal(history.getReview(active.id).note, 'durable');
});

test('conflicting editors at the same revision cannot silently overwrite each other', async () => {
  await setup();
  const active = await service.beginWorkout({workout: 'tpl-upper'},60,now);
  const first = model.actOnSession(active,{type:'editSet',setIndex:0,kg:5,reps:8},now+1000);
  const other = model.actOnSession(active,{type:'editSet',setIndex:0,kg:7,reps:9},now+1000);
  await service.saveActiveTraining(first);
  await assert.rejects(service.saveActiveTraining(other),/newer workout/);
  assert.equal(service.getActiveTraining().training.exercises[0].sets[0].kg,5);
  await service.saveActiveTraining(first); // Exact retry remains safe.
});

test('custom owner workout keeps range targets, explicit rest override and detached snapshot', async () => {
  const p = await setup();
  const store = load('modules/workouts/store.js').getStore();
  const exerciseId = store.getWorkout('tpl-upper').items[0].exerciseId;
  const workout = store.createWorkout({ title: 'My ranges', items: [{ exerciseId, sets: 2, reps: '8–12', rest: 90 }] });
  assert.ok(workout);
  const active = await service.beginWorkout({ workout: workout.id }, 45, now);
  assert.equal(active.title, 'My ranges');
  assert.equal(active.training.exercises[0].targetReps, '8–12');
  assert.equal(active.training.exercises[0].restSec, 45);
  store.updateWorkout(workout.id, { title: 'Later edit', items: [{ exerciseId, sets: 4, reps: '20', rest: 120 }] });
  await storage.writeDurable('fitlens.barrier', true);
  await storage.hydrate(p);
  assert.equal(service.getActiveTraining().title, 'My ranges');
  assert.equal(service.getActiveTraining().training.exercises[0].sets.length, 2);
  const result = await service.completeWorkout(done(active));
  assert.deepEqual(result.history.sets, [{ exerciseId, kg: 0, reps: 8 }]);
});

test('default rest comes from each owner workout item', async () => {
  await setup();
  const workout = workouts.getWorkout('tpl-upper');
  const active = await service.beginWorkout({ workout: workout.id }, undefined, now);
  assert.deepEqual(active.training.exercises.map(e => e.restSec), workout.items.map(i => i.rest));
  assert.deepEqual(active.training.exercises.map(e => e.targetReps), workout.items.map(i => i.reps));
});
