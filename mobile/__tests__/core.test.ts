import { PersistentStorage } from '../src/core/persistentStorage';
import { createAppStore } from '../src/core/appStore';
import { FakeBackend } from '../test-utils/fakeBackend';

const WEEK = '2026-11-09'; // a Monday

test('storage: reads what the backend already had, ignores other apps keys', async () => {
  const b = new FakeBackend();
  b.data.set('fitlens.sessions', '{"v":1,"data":[]}');
  b.data.set('other.key', 'x');
  const s = new PersistentStorage(b);
  await s.hydrate();
  expect(s.getItem('fitlens.sessions')).toBe('{"v":1,"data":[]}');
  expect(s.getItem('other.key')).toBeNull();
});

test('storage: writes are readable at once and reach the backend in order (last write wins)', async () => {
  const b = new FakeBackend();
  const s = new PersistentStorage(b);
  await s.hydrate();
  s.setItem('fitlens.a', '1');
  s.setItem('fitlens.a', '2');
  expect(s.getItem('fitlens.a')).toBe('2');
  await s.flush();
  expect(b.data.get('fitlens.a')).toBe('2');
  s.removeItem('fitlens.a');
  await s.flush();
  expect(b.data.has('fitlens.a')).toBe(false);
});

test('storage: a failing backend never throws; the app keeps working in memory', async () => {
  const b = new FakeBackend();
  b.failReads = true;
  b.failWrites = true;
  const s = new PersistentStorage(b);
  await expect(s.hydrate()).resolves.toBeUndefined();
  s.setItem('fitlens.a', '1');
  await s.flush();
  expect(s.getItem('fitlens.a')).toBe('1');
  expect(s.failedWrites).toBe(1);
});

test('store: a custom workout survives an app restart', async () => {
  const b = new FakeBackend();
  const first = await createAppStore(b);
  const w = first.store.createWorkout({ title: 'My Sunday session' });
  expect(w).not.toBeNull();
  await first.storage.flush();

  const second = await createAppStore(b); // "restart": new store, same device storage
  expect(second.store.getWorkout((w as { id: string }).id)?.title).toBe('My Sunday session');
});

test('store: sessions added to the plan survive a restart and show in the right week', async () => {
  const b = new FakeBackend();
  const first = await createAppStore(b);
  const r = first.store.addSession({ workoutId: 'tpl-core', date: '2026-11-11', time: '18:30' });
  expect(r.ok).toBe(true);
  await first.storage.flush();

  const second = await createAppStore(b);
  const week = second.store.getWeekSchedule(WEEK);
  expect(week.map(s => [s.workoutId, s.date, s.time])).toEqual([['tpl-core', '2026-11-11', '18:30']]);
  expect(second.store.getWeekSchedule('2026-11-16')).toEqual([]);
});

test('draft: never suggests a workout that loads an area the user avoids', async () => {
  const { store } = await createAppStore(new FakeBackend());
  const draft = store.generateDraft(
    { goal: 'strength', daysPerWeek: 3, minutes: 30, equipment: ['dumbbells', 'bands', 'mat', 'bench'], avoidRegions: ['knees'] },
    WEEK,
  );
  expect(draft).not.toBeNull();
  for (const s of (draft as { sessions: { workoutId: string }[] }).sessions) {
    expect(['tpl-walk', 'tpl-cardio', 'tpl-bodyweight', 'tpl-lower-plan', 'tpl-full-plan']).not.toContain(s.workoutId);
  }
  expect(
    store.generateDraft(
      { goal: 'habit', daysPerWeek: 3, minutes: 30, equipment: [], avoidRegions: ['knees', 'back', 'wrists', 'shoulders', 'ankles', 'hips'] },
      WEEK,
    ),
  ).toBeNull();
});

test('draft: applying the same draft twice adds each session once', async () => {
  const { store } = await createAppStore(new FakeBackend());
  const draft = store.generateDraft({ goal: 'habit', daysPerWeek: 3, minutes: 30, equipment: [], avoidRegions: [] }, WEEK);
  expect(store.applyDraft(draft as never)).toMatchObject({ ok: true, added: 3 });
  expect(store.applyDraft(draft as never)).toMatchObject({ ok: true, added: 0, skipped: 3 });
  expect(store.getWeekSchedule(WEEK)).toHaveLength(3);
});

test('shared models behave the same here as in the browser prototype', async () => {
  const { store } = await createAppStore(new FakeBackend());
  expect(store.weekStartOf('2026-11-15')).toBe('2026-11-09'); // Sunday belongs to the week that started Monday
  expect(store.getWorkout('tpl-upper')?.items).toHaveLength(6);
  expect(store.exerciseName('goblet-squat')).toBe('Goblet Squat');
  expect(store.getWorkout('nope')).toBeNull();
});
