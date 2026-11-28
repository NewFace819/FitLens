'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { MemoryStorage } = require('./helpers.js');

const source = readFileSync(require.resolve('../training-model.js'), 'utf8');
const activeSource = readFileSync(require.resolve('../workout-active.js'), 'utf8');

function loadTraining(storage, recordWorkout = () => {}) {
  const window = { localStorage: storage, FitLensRhythm: { record: recordWorkout } };
  runInNewContext(source, { window });
  return window.FitLensTraining;
}

function loadActiveWorkout(model, planned) {
  const sessionStorage = new MemoryStorage();
  const launch = {
    routine: 'upper', plannedId: planned.id, items: [{ id: 'bench', sets: 1 }],
  };
  sessionStorage.setItem('fitlens-ui-session-plan', JSON.stringify(launch));
  sessionStorage.setItem('fitlens-ui-active', JSON.stringify({
    routine: 'upper', ids: ['bench'], logs: [[{ weight: 20, reps: 8, done: true }]],
    index: 0, elapsed: 30, phase: 'working', rhythmSessionId: 'workout-in-progress',
  }));
  const location = {
    href: `workout-active.html?routine=upper&planned=${planned.id}`,
    search: `?routine=upper&planned=${planned.id}`,
  };
  const nodes = new Map();
  function element() {
    return {
      dataset: {}, style: {}, classList: { toggle() {} }, firstChild: {},
      append() {}, after() {}, replaceChildren() {}, setAttribute() {},
      showModal() { this.open = true; },
      getBoundingClientRect() { return { left: 0, width: 375, bottom: 800 }; },
      addEventListener(name, handler) { this[name] = handler; },
    };
  }
  function find(selector) {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  }
  runInNewContext(activeSource, {
    document: { querySelector: find, querySelectorAll: () => [], createElement: element, createTextNode: () => ({}) },
    window: { FitLensTraining: model, addEventListener() {} },
    FitLensTraining: model, FitLensCoach: { history: () => [], pinned: () => null, why: () => null },
    FitLensCoachUI: {}, location, URLSearchParams, sessionStorage, innerHeight: 800,
    addEventListener() {}, setInterval() {},
  });
  function click(selector) {
    const node = find(selector);
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    node.click(event);
    if (node.href && !event.defaultPrevented) location.href = node.href;
  }
  return { click, find, location, sessionStorage };
}

test('stopping a planned workout closes its calendar slot and keeps one stopped record after reload', () => {
  const storage = new MemoryStorage();
  const credited = [];
  const model = loadTraining(storage, workout => credited.push(workout.id));
  const planned = model.add('upper', model.addDays(model.today(), 1));
  const next = model.add('lower', model.addDays(planned.date, 1));
  const stopped = {
    sessionId: planned.id,
    id: 'workout-stopped',
    outcome: 'stopped',
    seconds: 63,
  };

  const history = model.complete(stopped);
  assert.equal(history.outcome, 'stopped');
  assert.equal(history.sessionId, planned.id);
  assert.equal(model.find(planned.id).status, 'completed');
  assert.equal(model.find(planned.id).completedAt, history.at);
  assert.equal(model.next().id, next.id);

  const reloaded = loadTraining(storage, workout => credited.push(workout.id));
  const retry = reloaded.complete({ ...stopped, seconds: 100 });
  assert.equal(retry.id, history.id);
  assert.equal(retry.seconds, history.seconds);
  assert.equal(reloaded.read().history.length, 1);
  assert.equal(reloaded.find(planned.id).completedAt, history.at);
  assert.deepEqual(credited, []);

  reloaded.complete({ sessionId: next.id });
  assert.deepEqual(credited, [next.id]);
});

test('existing stopped history repairs a planned calendar slot without replacing the record', () => {
  const storage = new MemoryStorage();
  const model = loadTraining(storage);
  const planned = model.add('upper', model.addDays(model.today(), 1));
  const other = model.add('lower', model.addDays(planned.date, 1));
  const legacyStop = {
    id: 'legacy-stopped',
    sessionId: planned.id,
    outcome: 'stopped',
    date: planned.date,
    at: `${planned.date}T05:30:00.000Z`,
  };
  const persisted = JSON.parse(storage.getItem(model.KEY));
  persisted.history.push(legacyStop);
  storage.setItem(model.KEY, JSON.stringify(persisted));

  const reloaded = loadTraining(storage);
  assert.equal(reloaded.find(planned.id).status, 'completed');
  assert.equal(reloaded.find(other.id).status, 'planned');
  const restored = JSON.parse(storage.getItem(model.KEY));
  assert.deepEqual(restored.history, [legacyStop]);
  assert.equal(restored.sessions[0].completedAt, legacyStop.at);
});

for (const control of ['#finish-session', '#complete-set']) {
  test(`${control} stays in Workout on storage failure and retry saves once`, () => {
    const storage = new MemoryStorage();
    const model = loadTraining(storage);
    const planned = model.add('upper', model.addDays(model.today(), 1));
    const active = loadActiveWorkout(model, planned);
    if (control === '#finish-session') active.click('#session-menu');
    const initialUrl = active.location.href;
    const initialSnapshot = active.sessionStorage.getItem('fitlens-ui-active');
    let blocked = true;
    const store = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (blocked) throw new Error('storage blocked');
      store(key, value);
    };

    active.click(control);
    assert.equal(active.location.href, initialUrl);
    assert.equal(active.find('#menu-dialog').open, true);
    assert.equal(active.find('#finish-save-error').hidden, false);
    assert.equal(active.sessionStorage.getItem('fitlens-ui-active'), initialSnapshot);
    assert.equal(model.find(planned.id).status, 'planned');
    assert.equal(model.read().history.length, 0);

    blocked = false;
    active.click('#finish-session');
    assert.equal(new URL(active.location.href, 'https://fitlens.test').searchParams.get('completed'), planned.id);
    assert.equal(model.find(planned.id).status, 'completed');
    assert.equal(model.read().history.length, 1);
    assert.equal(model.read().history[0].logs[0][0].reps, 8);
  });
}
