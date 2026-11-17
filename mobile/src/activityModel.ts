// Port of prototype/activity-model.js: manual entries only; workout history is supplied by its owner.
import AsyncStorage from '@react-native-async-storage/async-storage';
export const activityTypes = {
  walk: 'Walking',
  run: 'Running',
  cycle: 'Cycling',
  swim: 'Swimming',
} as const;
export type Entry = {
  id: string;
  type: keyof typeof activityTypes;
  name: string;
  date: string;
  seconds: number;
  distanceKm: number | null;
  elevationM: number | null;
  note: string;
  effort: 'easy' | 'steady' | 'hard' | null;
  at: string;
  source: 'manual';
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
};
export function validDate(value: string) {
  const d = new Date(value + 'T12:00:00');
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(d.getTime()) &&
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}` === value
  );
}
export function validateEntry(e: Entry) {
  if (!(e.type in activityTypes)) throw new Error('Choose an activity.');
  if (!validDate(e.date) || e.date > today())
    throw new Error('Choose today or an earlier date.');
  if (!Number.isFinite(e.seconds) || e.seconds < 1 || e.seconds > 86400)
    throw new Error('Enter a duration between 1 second and 24 hours.');
  if (
    e.distanceKm !== null &&
    (!Number.isFinite(e.distanceKm) || e.distanceKm < 0 || e.distanceKm > 10000)
  )
    throw new Error('Check your distance.');
  if (
    e.elevationM !== null &&
    (!Number.isFinite(e.elevationM) || e.elevationM < 0 || e.elevationM > 30000)
  )
    throw new Error('Check your ascent.');
  return {
    ...e,
    seconds: Math.round(e.seconds),
    name: e.name.trim().slice(0, 80) || activityTypes[e.type],
    note: e.note.slice(0, 500),
    elevationM: e.type === 'swim' ? null : e.elevationM,
  };
}
const KEY = 'fitlens:activities:v1';
export async function readEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const state = JSON.parse(raw);
  if (state.version !== 1 || !Array.isArray(state.entries))
    throw new Error('Activity data unavailable.');
  return state.entries.map((entry: Entry) => validateEntry(entry));
}
export async function writeEntries(entries: Entry[]) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({ version: 1, entries, active: null }),
  );
}
