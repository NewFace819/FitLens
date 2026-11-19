/** OWNER: Đỗ Huy. Activity contract on the hydrated shared cache. */
import {
  ACTIVITY_TYPES,
  isOneOf,
  type ActivityType,
} from '../../shared/constants';
import { isDateKey, toDateKey } from '../../shared/dates';
import { KEYS, read, write } from '../../shared/storage';
export const activityTypes: Record<ActivityType, string> = {
  walk: 'Walking',
  run: 'Running',
  cycle: 'Cycling',
  swim: 'Swimming',
  other: 'Other movement',
};
export type Activity = {
  id: string;
  type: ActivityType;
  name: string;
  date: string;
  durationSec: number;
  distanceKm: number | null;
  elevationM: number | null;
  note: string;
  effort: 'easy' | 'steady' | 'hard' | null;
  at: string;
  source: 'manual';
};
export function validateActivity(e: Activity): Activity {
  if (!isOneOf(ACTIVITY_TYPES, e.type)) throw new Error('Choose an activity.');
  if (!isDateKey(e.date) || e.date > toDateKey(new Date()))
    throw new Error('Choose today or an earlier date.');
  if (
    !Number.isFinite(e.durationSec) ||
    e.durationSec < 1 ||
    e.durationSec > 86400
  )
    throw new Error('Enter a duration between 1 second and 24 hours.');
  for (const [value, max, label] of [
    [e.distanceKm, 10000, 'distance'],
    [e.elevationM, 30000, 'ascent'],
  ] as const)
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > max))
      throw new Error('Check your ' + label + '.');
  return {
    ...e,
    durationSec: Math.round(e.durationSec),
    name: e.name.trim().slice(0, 80) || activityTypes[e.type],
    note: e.note.slice(0, 500),
    distanceKm: e.type === 'other' ? null : e.distanceKm,
    elevationM: ['swim', 'other'].includes(e.type) ? null : e.elevationM,
  };
}
function parse(data: unknown): Activity[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap(raw => {
    try {
      if (
        !raw ||
        typeof raw.id !== 'string' ||
        !isDateKey(raw.date) ||
        !isOneOf(ACTIVITY_TYPES, raw.type)
      )
        return [];
      const value = {
        ...raw,
        name:
          typeof raw.name === 'string'
            ? raw.name
            : activityTypes[raw.type as ActivityType],
        note: typeof raw.note === 'string' ? raw.note : '',
        distanceKm: raw.distanceKm ?? null,
        elevationM: raw.elevationM ?? null,
        effort: ['easy', 'steady', 'hard'].includes(raw.effort)
          ? raw.effort
          : null,
        source: 'manual' as const,
        at: typeof raw.at === 'string' ? raw.at : '',
      };
      return [validateActivity(value)];
    } catch {
      return [];
    }
  });
}
export function getActivities(
  range: { from?: string; to?: string } = {},
): Activity[] {
  return read(KEYS.activities, [] as Activity[], { parse })
    .filter(
      e =>
        (!range.from || e.date >= range.from) &&
        (!range.to || e.date <= range.to),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.at || '').localeCompare(a.at || ''),
    );
}
export function saveActivity(value: Activity): Activity | null {
  try {
    const clean = validateActivity(value);
    if (
      !write(KEYS.activities, [
        clean,
        ...getActivities().filter(e => e.id !== clean.id),
      ])
    )
      return null;
    return clean;
  } catch (error) {
    console.warn(
      'saveActivity:',
      error instanceof Error ? error.message : 'Invalid activity',
    );
    return null;
  }
}
export function removeActivity(id: string): boolean {
  return write(
    KEYS.activities,
    getActivities().filter(e => e.id !== id),
  );
}
