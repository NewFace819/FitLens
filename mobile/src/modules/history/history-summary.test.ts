import {
  formatDuration,
  formatKg,
  groupByWeek,
  monthTotals,
  plural,
  setVolumeKg,
  totals,
  weekHeading,
} from './history-summary';
import type { HistoryEntry } from './history-model';

const entry = (id: string, date: string, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id,
  sessionId: null,
  workoutId: 'tpl-lower',
  date,
  durationSec: 30 * 60,
  stoppedByPain: false,
  sets: [
    { exerciseId: 'goblet-squat', kg: 12.5, reps: 10 },
    { exerciseId: 'goblet-squat', kg: 12.5, reps: 8 },
    { exerciseId: 'push-up', kg: 0, reps: 15 },
    { exerciseId: 'plank', durationSec: 45 },
  ],
  ...extra,
});

test('volume is weight × reps; bodyweight, missing kg and timed sets add nothing', () => {
  expect(setVolumeKg({ exerciseId: 'a', kg: 20, reps: 10 })).toBe(200);
  expect(setVolumeKg({ exerciseId: 'a', kg: 0, reps: 10 })).toBe(0);
  expect(setVolumeKg({ exerciseId: 'a', kg: null, reps: 10 })).toBe(0);
  expect(setVolumeKg({ exerciseId: 'a', durationSec: 60 })).toBe(0);
});

test('totals add sessions, sets, distinct exercises, volume, time and pain stops', () => {
  expect(totals([entry('a', '2026-11-23'), entry('b', '2026-11-25', { stoppedByPain: true, sets: [] })])).toEqual({
    sessions: 2,
    sets: 4,
    exercises: 3,
    volumeKg: 225,
    durationSec: 3600,
    painStops: 1,
  });
  expect(totals([])).toEqual({ sessions: 0, sets: 0, exercises: 0, volumeKg: 0, durationSec: 0, painStops: 0 });
  expect(totals([entry('c', '2026-11-23', { sets: [{ exerciseId: 'a', kg: 0.1, reps: 3 }] })]).volumeKg).toBe(0.3);
});

test('weeks are Monday-based, newest first, and keep entry order inside a week', () => {
  // 2026-11-23 is a Monday, 2026-11-29 the Sunday of the same week.
  const groups = groupByWeek([
    entry('sun', '2026-11-29'),
    entry('mon', '2026-11-23'),
    entry('prev-sun', '2026-11-22'),
    entry('old', '2026-11-02'),
  ]);
  expect(groups.map(g => g.weekStart)).toEqual(['2026-11-23', '2026-11-16', '2026-11-02']);
  expect(groups[0].entries.map(e => e.id)).toEqual(['sun', 'mon']);
  expect(groups[0].totals.sessions).toBe(2);
  expect(groupByWeek([])).toEqual([]);
});

test('week headings name this week and last week, then show the date range', () => {
  const today = '2026-11-28';
  expect(weekHeading('2026-11-23', today)).toBe('This week');
  expect(weekHeading('2026-11-16', today)).toBe('Last week');
  expect(weekHeading('2026-11-09', today)).toBe('Nov 9 – Nov 15');
});

test('month totals only count the current calendar month', () => {
  const month = monthTotals([entry('nov', '2026-11-01'), entry('oct', '2026-10-31')], '2026-11-28');
  expect(month.month).toBe('November');
  expect(month.sessions).toBe(1);
  expect(monthTotals([], '2026-01-05')).toMatchObject({ month: 'January', sessions: 0, volumeKg: 0 });
});

test('formats durations, kilograms and plurals for display', () => {
  expect(formatDuration(0)).toBe('0 min');
  expect(formatDuration(48 * 60 + 59)).toBe('48 min');
  expect(formatDuration(65 * 60)).toBe('1 h 05 min');
  expect(formatKg(3240)).toBe('3,240 kg');
  expect(formatKg(1234567.25)).toBe('1,234,567.3 kg');
  expect(formatKg(12.5)).toBe('12.5 kg');
  expect(formatKg(0)).toBe('0 kg');
  expect(plural(1, 'workout')).toBe('1 workout');
  expect(plural(3, 'workout')).toBe('3 workouts');
});
