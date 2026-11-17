import { validateEntry, today, Entry } from './activityModel';
const entry: Entry = {
  id: 'test',
  type: 'walk',
  name: '',
  date: today(),
  seconds: 120,
  distanceKm: null,
  elevationM: null,
  note: '',
  effort: null,
  at: '',
  source: 'manual',
};
test('rejects impossible calendar dates and future dates', () => {
  expect(() => validateEntry({ ...entry, date: '2026-02-30' })).toThrow();
  expect(() => validateEntry({ ...entry, date: '2999-01-01' })).toThrow();
});
test('validates optional numeric metrics and duration', () => {
  expect(() => validateEntry({ ...entry, seconds: 0 })).toThrow();
  expect(() => validateEntry({ ...entry, distanceKm: NaN })).toThrow();
  expect(
    validateEntry({ ...entry, type: 'swim', elevationM: 20 }).elevationM,
  ).toBeNull();
});
