import { PersistentStorage, KeyValueBackend } from './persistentStorage';
import type { AppStore, Draft, Profile } from './types';

// The shared models. Static require() paths so Metro can bundle them (see metro.config.js).
const { createStore } = require('../../../prototype/workout-store.js');
const DraftModel = require('../../../prototype/draft-model.js');
const Dates = require('../../../prototype/shared/dates.js');
const Exercises = require('../../../prototype/shared/exercises.js');

export type AppStoreHandle = { store: AppStore; storage: PersistentStorage };

/** Real device storage. Loaded lazily so tests that pass their own backend never touch the native module. */
export function defaultBackend(): KeyValueBackend {
  const { createAsyncStorage } = require('@react-native-async-storage/async-storage');
  return createAsyncStorage('fitlens');
}

/** Hydrates storage, then builds the store the screens use. */
export async function createAppStore(backend: KeyValueBackend = defaultBackend()): Promise<AppStoreHandle> {
  const storage = new PersistentStorage(backend);
  await storage.hydrate();
  const base = createStore({ localStorage: storage, sessionStorage: null });
  const store: AppStore = {
    ...base,
    generateDraft: (profile: Partial<Profile>, weekStart: string): Draft | null =>
      DraftModel.generateDraft(profile, weekStart, base.listWorkouts()),
    applyDraft: (draft: Draft) => DraftModel.applyDraft(draft, base),
    listExercises: () => Exercises.listExercises(),
    weekDates: (weekStart: string): string[] => Dates.weekDates(weekStart),
    addDays: (date: string, n: number): string | null => Dates.addDays(date, n),
    exerciseName: (id: string): string => {
      const e = Exercises.getExercise(id);
      return e ? e.name : id;
    },
  };
  return { store, storage };
}
