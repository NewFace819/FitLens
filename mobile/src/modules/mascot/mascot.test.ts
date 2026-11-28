import { hydrate, KEYS, read, write } from '../../shared/storage';
import { toDateKey } from '../../shared/dates';
import {
  getMascotMood,
  getMascotState,
  MOOD_DISPLAY_MS,
  noteActivityMood,
  setMascotMood,
} from './mascot';
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-28T10:00:00Z'));
  await hydrate(null);
});
afterEach(() => jest.useRealTimers());
test('a recent check-in expires to waiting without rewriting its stored event', () => {
  setMascotMood('concerned');
  const original = read(KEYS.mascot, null);
  expect(getMascotState().expiresAt).toBe(Date.now() + MOOD_DISPLAY_MS);
  jest.advanceTimersByTime(MOOD_DISPLAY_MS - 1);
  expect(getMascotMood()).toBe('concerned');
  jest.advanceTimersByTime(1);
  expect(getMascotMood()).toBe('waiting');
  expect(read(KEYS.mascot, null)).toEqual(original);
});
test.each([undefined, 'bad-date', '2099-01-01T00:00:00Z'])(
  'an unusable or future timestamp %s cannot keep a mood indefinitely',
  at => {
    write(KEYS.mascot, { mood: 'exhausted', at });
    expect(getMascotMood()).toBe('waiting');
  },
);
test('new or invalid state keeps the friendly default', () => {
  expect(getMascotMood()).toBe('happy');
  write(KEYS.mascot, { mood: 'unknown' });
  expect(getMascotMood()).toBe('happy');
});
test.each(['concerned', 'tired', 'exhausted'] as const)(
  'activity preserves recent %s and its original timestamp',
  mood => {
    setMascotMood(mood);
    const original = read(KEYS.mascot, null);
    noteActivityMood(toDateKey(new Date()));
    expect(read(KEYS.mascot, null)).toEqual(original);
    expect(getMascotMood()).toBe(mood);
  },
);
test('logging a past activity does not replace todays expression', () => {
  setMascotMood('content');
  noteActivityMood('2026-11-20');
  expect(getMascotMood()).toBe('content');
});
test('todays activity can energize a neutral or expired display', () => {
  noteActivityMood(toDateKey(new Date()));
  expect(getMascotMood()).toBe('energized');
  setMascotMood('concerned');
  jest.advanceTimersByTime(MOOD_DISPLAY_MS);
  noteActivityMood(toDateKey(new Date()));
  expect(getMascotMood()).toBe('energized');
});
