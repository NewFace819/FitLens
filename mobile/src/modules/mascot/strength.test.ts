/** #30: strength level from training history. */
import { hydrate, KEYS, write } from '../../shared/storage';
import type { HistoryEntry } from '../history/history';
import { getStrength, LEVELS, levelFor, MAX_LEVEL, strengthFrom, strengthHint, strengthPoints } from './strength';

const none = { sessions: 0, sets: 0, goalWeeks: 0, longestStreak: 0 };

test('thresholds: each level starts exactly at its minimum', () => {
  expect(LEVELS.map((l) => l.min)).toEqual([0, 25, 75, 150, 275, 450]);
  LEVELS.forEach((l, i) => {
    expect(levelFor(l.min)).toMatchObject({ level: i + 1, name: l.name });
    if (l.min > 0) expect(levelFor(l.min - 1).level).toBe(i);
  });
  expect(levelFor(100000)).toMatchObject({ level: MAX_LEVEL, nextAt: null, nextName: null, progress: 1 });
});

test('a new user starts at level 1 and moves up on their second full session', () => {
  expect(strengthFrom(none)).toEqual({ level: 1, name: 'Starter', points: 0, nextAt: 25, nextName: 'Steady', progress: 0 });
  const one = strengthFrom({ ...none, sessions: 1, sets: 9 });
  const two = strengthFrom({ ...none, sessions: 2, sets: 18 });
  expect(one.level).toBe(1);
  expect(two.level).toBe(2);
  expect(strengthHint(one)).toBe('6 points to Steady');
});

test('points: sessions, volume (sets), goal weeks and the longest streak all count', () => {
  expect(strengthPoints({ sessions: 3, sets: 27, goalWeeks: 1, longestStreak: 1 })).toBe(30 + 27 + 15 + 5);
  expect(strengthPoints({ sessions: -2, sets: NaN, goalWeeks: 1.9, longestStreak: Infinity })).toBe(15);
});

test('more training never lowers the level', () => {
  let last = 0;
  for (let n = 0; n <= 40; n++) {
    const s = strengthFrom({ sessions: n, sets: n * 8, goalWeeks: Math.floor(n / 3), longestStreak: Math.floor(n / 3) });
    expect(s.level).toBeGreaterThanOrEqual(last);
    expect(s.progress).toBeGreaterThanOrEqual(0);
    expect(s.progress).toBeLessThanOrEqual(1);
    last = s.level;
  }
  expect(last).toBe(MAX_LEVEL);
});

describe('getStrength from storage', () => {
  const entry = (i: number, date: string, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id: `hs-${i}`, sessionId: null, workoutId: 'tpl-upper', date, durationSec: 1800, stoppedByPain: false,
    sets: Array.from({ length: 9 }, () => ({ exerciseId: 'bench-press', kg: 10, reps: 10 })),
    ...over,
  });
  beforeEach(async () => { await hydrate(null); });

  test('no history → level 1, never throws', () => {
    expect(getStrength('2026-11-19')).toMatchObject({ level: 1, points: 0 });
  });

  test('finishing more sessions visibly raises the level', () => {
    write(KEYS.history, [entry(1, '2026-11-16')]);
    expect(getStrength('2026-11-19').level).toBe(1);
    write(KEYS.history, [entry(2, '2026-11-18'), entry(1, '2026-11-16')]);
    expect(getStrength('2026-11-19').level).toBe(2);
  });

  test('a workout stopped for pain adds its sets, not a finished session', () => {
    write(KEYS.history, [entry(1, '2026-11-16', { stoppedByPain: true, sets: [{ exerciseId: 'bench-press', kg: 10, reps: 5 }] })]);
    expect(getStrength('2026-11-19').points).toBe(1);
  });
});
