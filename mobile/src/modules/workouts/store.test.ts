/**
 * Hải's workouts/schedule store on the app's shared storage: the shared prototype models read and
 * write through `localStorageView`, so there is one cache and one copy on the device.
 */
import { hydrate, localStorageView, read, type Persistence } from '../../shared/storage';
import { getStore } from './store';

const WEEK = '2026-11-09'; // a Monday

/** In-memory stand-in for AsyncStorage, so a "restart" can hydrate from what was saved. */
function fakeDevice() {
  const data = new Map<string, string>();
  const persistence: Persistence = {
    loadAll: async () => [...data.entries()],
    save: async (k, v) => void data.set(k, v),
    remove: async keys => keys.forEach(k => data.delete(k)),
  };
  return { data, persistence };
}
const flush = () => new Promise<void>(r => setTimeout(r, 0));

/** Hydrate from a device and hand back the store, like the app does at start-up. */
async function createAppStore(device = fakeDevice()) {
  await hydrate(device.persistence);
  return { store: getStore(), device };
}

test('store writes go through the shared cache: other modules see them at once', async () => {
  const { store } = await createAppStore();
  const w = store.createWorkout({ title: 'Shared' });
  expect(w).not.toBeNull();
  const raw = read<{ title: string }[]>('fitlens.workouts', []);
  expect(raw.map(x => x.title)).toContain('Shared');
  expect(JSON.parse(localStorageView.getItem('fitlens.workouts') as string).v).toBe(1);
});

test('store: a custom workout survives an app restart', async () => {
  const device = fakeDevice();
  const first = await createAppStore(device);
  const w = first.store.createWorkout({ title: 'My Sunday session' });
  expect(w).not.toBeNull();
  await flush();

  const second = await createAppStore(device); // "restart": new store, same device storage
  expect(second.store.getWorkout((w as { id: string }).id)?.title).toBe('My Sunday session');
});

test('store: sessions added to the plan survive a restart and show in the right week', async () => {
  const device = fakeDevice();
  const first = await createAppStore(device);
  const r = first.store.addSession({ workoutId: 'tpl-core', date: '2026-11-11', time: '18:30' });
  expect(r.ok).toBe(true);
  await flush();

  const second = await createAppStore(device);
  const week = second.store.getWeekSchedule(WEEK);
  expect(week.map(s => [s.workoutId, s.date, s.time])).toEqual([['tpl-core', '2026-11-11', '18:30']]);
  expect(second.store.getWeekSchedule('2026-11-16')).toEqual([]);
});

test('draft: never suggests a workout that loads an area the user avoids', async () => {
  const { store } = await createAppStore();
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
  const { store } = await createAppStore();
  const draft = store.generateDraft({ goal: 'habit', daysPerWeek: 3, minutes: 30, equipment: [], avoidRegions: [] }, WEEK);
  expect(store.applyDraft(draft as never)).toMatchObject({ ok: true, added: 3 });
  expect(store.applyDraft(draft as never)).toMatchObject({ ok: true, added: 0, skipped: 3 });
  expect(store.getWeekSchedule(WEEK)).toHaveLength(3);
});

test('shared models behave the same here as in the browser prototype', async () => {
  const { store } = await createAppStore();
  expect(store.weekStartOf('2026-11-15')).toBe('2026-11-09'); // Sunday belongs to the week that started Monday
  expect(store.getWorkout('tpl-upper')?.items).toHaveLength(6);
  expect(store.exerciseName('goblet-squat')).toBe('Goblet Squat');
  expect(store.getWorkout('nope')).toBeNull();
});
