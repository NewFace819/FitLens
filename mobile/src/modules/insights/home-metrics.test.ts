import { hydrate, KEYS, write } from '../../shared/storage';
import { getHomeMetrics, getSteps } from './home-metrics';

const DATE = '2026-11-24';

beforeEach(async () => {
  await hydrate(null);
});

test('getSteps returns the requested date and a stable prototype count', () => {
  expect(getSteps(DATE)).toEqual({ date: DATE, steps: 3_150 });
  expect(getSteps('2026-11-25')).toEqual({ date: '2026-11-25', steps: 3_150 });
});

test('a date without workouts receives clearly labeled sample metrics', () => {
  expect(getHomeMetrics(DATE)).toEqual({
    date: DATE,
    steps: getSteps(DATE).steps,
    activeMinutes: 70,
    activeEnergyKcal: null,
    isSample: true,
  });
});

test('workout minutes aggregate the requested day before rounding', () => {
  write(KEYS.history, [
    { id: 'first', workoutId: 'upper', date: DATE, durationSec: 89 },
    { id: 'second', workoutId: 'lower', date: DATE, durationSec: 89 },
    { id: 'yesterday', workoutId: 'upper', date: '2026-11-23', durationSec: 600 },
  ]);

  expect(getHomeMetrics(DATE)).toEqual({
    date: DATE,
    steps: getSteps(DATE).steps,
    activeMinutes: 3,
    activeEnergyKcal: null,
    isSample: true,
  });
  expect(getHomeMetrics('2026-11-25').activeMinutes).toBe(70);
});

test('a zero-duration entry is kept as workout history rather than replaced by samples', () => {
  write(KEYS.history, [
    { id: 'stopped', workoutId: 'upper', date: DATE, durationSec: 0, stoppedByPain: true },
  ]);

  expect(getHomeMetrics(DATE).activeMinutes).toBe(0);
});
