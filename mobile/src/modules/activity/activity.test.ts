import {
  getActivities,
  saveActivity,
  validateActivity,
  type Activity,
} from './activity';
import { hydrate, write, read, KEYS } from '../../shared/storage';
import { toDateKey } from '../../shared/dates';
const entry: Activity = {
  id: 'ac-test',
  type: 'walk',
  name: '',
  date: toDateKey(new Date()),
  durationSec: 120,
  distanceKm: null,
  elevationM: null,
  note: '',
  effort: null,
  source: 'manual',
  at: '2026-11-19T10:00:00Z',
};
beforeEach(async () => {
  await hydrate(null);
});
test('uses the shared cache and preserves contract fields and date range', () => {
  expect(saveActivity(entry)?.name).toBe('Walking');
  expect(getActivities({ from: entry.date, to: entry.date })[0]).toMatchObject({
    durationSec: 120,
    distanceKm: null,
  });
  expect(read(KEYS.activities, [])).toHaveLength(1);
  expect(getActivities({ to: '2000-01-01' })).toEqual([]);
});
test('ignores corrupt rows and rejects invalid inputs without changing existing data', () => {
  saveActivity(entry);
  expect(saveActivity({ ...entry, id: 'bad', date: '2026-02-30' })).toBeNull();
  expect(getActivities()).toHaveLength(1);
  write(KEYS.activities, [
    entry,
    { id: 'bad', type: 'teleport', date: entry.date },
  ]);
  expect(getActivities()).toHaveLength(1);
  expect(() => validateActivity({ ...entry, durationSec: 0 })).toThrow();
  expect(() => validateActivity({ ...entry, distanceKm: NaN })).toThrow();
});
test('does not overwrite activity envelopes from a newer app version', () => {
  write(KEYS.activities, [entry], 2);
  expect(saveActivity({ ...entry, id: 'ac-other' })).toBeNull();
  expect(getActivities().map(e => e.id)).toEqual(['ac-test']);
});
