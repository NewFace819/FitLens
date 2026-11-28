/**
 * Workouts & schedule — OWNER: Hải.
 *
 * The app uses the same pure-JS models as the browser prototype (../prototype: workout-model,
 * schedule-model, draft-model, shared/exercises), bound to the app's one shared storage cache
 * through `localStorageView`. So writes here are seen at once by every other module, and saved to
 * the device by shared/storage like everything else.
 */
import { localStorageView } from '../../shared/storage';
import type { AppStore, Draft, Profile } from './types';

// Static require() paths so Metro can bundle them (see metro.config.js watchFolders).
const { createStore } = require('../../../../prototype/workout-store.js');
const DraftModel = require('../../../../prototype/draft-model.js');
const Dates = require('../../../../prototype/shared/dates.js');
const Exercises = require('../../../../prototype/shared/exercises.js');

function build(): AppStore {
  const base = createStore({ localStorage: localStorageView, sessionStorage: null });
  return {
    ...base,
    generateDraft: (profile: Partial<Profile>, weekStart: string, loadAdjust = 0): Draft | null =>
      DraftModel.generateDraft(profile, weekStart, base.listWorkouts(), loadAdjust),
    applyDraft: (draft: Draft) => DraftModel.applyDraft(draft, base),
    listExercises: () => Exercises.listExercises(),
    weekDates: (weekStart: string): string[] => Dates.weekDates(weekStart),
    addDays: (date: string, n: number): string | null => Dates.addDays(date, n),
    exerciseName: (id: string): string => Exercises.getExercise(id)?.name ?? id,
  };
}

let store: AppStore | null = null;

/** The store the Workouts/Plan screens use. The models read storage on every call, so one instance is enough. */
export function getStore(): AppStore {
  if (!store) store = build();
  return store;
}

/** Exercise catalogue lookup (DATA_CONTRACT §9: id, name, regions, equipment, muscles). */
export function getCatalogExercise(id: string): { id: string; name: string; regions: string[]; equipment: string[]; muscles: string[] } | null {
  return Exercises.getExercise(id) ?? null;
}
