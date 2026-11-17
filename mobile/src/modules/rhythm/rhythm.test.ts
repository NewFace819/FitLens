import { addDays, nextMonday, weekStartOf } from '../../shared/dates';
import {
  EMPTY_STATE, computeRhythm, parseState, withPause, withResume, withWeeklyGoal,
  type DoneSession, type RhythmState,
} from './rhythm-model';

// Thursday 2026-10-29 → week of Monday 2026-10-26.
const TODAY = '2026-10-29';
const W0 = '2026-10-26';
const week = (monday: string, n: number): DoneSession[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${monday}-${i}`, date: addDays(monday, i), title: 'Workout' }));
const goal = (n: number, from: string): RhythmState => ({ goals: [{ weeklyGoal: n, fromWeek: from }], pauses: [] });

test('week helpers (contract §2: Monday start)', () => {
  expect(weekStartOf('2026-11-01')).toBe('2026-10-26');
  expect(nextMonday('2026-10-29')).toBe('2026-11-02');
});

test('nothing yet → empty; contract fields present', () => {
  const r = computeRhythm([], EMPTY_STATE, 3, TODAY);
  expect(r.status).toBe('empty');
  expect(r.weeklyGoal).toBe(null);
  expect(r.streakWeeks).toBe(0);
  expect(r.pausedUntil).toBe(null);
});

test('weeklyGoal null → uses Profile.daysPerWeek (G8)', () => {
  const start = addDays(W0, -14);
  const r = computeRhythm([...week(start, 2), ...week(addDays(start, 7), 2), ...week(W0, 1)], EMPTY_STATE, 2, TODAY);
  expect(r.goalSource).toBe('profile');
  expect(r.goal).toBe(2);
  expect(r.streakWeeks).toBe(2);
});

test('six weeks + 2 of 3 this week → active, streak 6 (week unit, G10)', () => {
  const start = addDays(W0, -42);
  const sessions = [0, 1, 2, 3, 4, 5].flatMap((i) => week(addDays(start, i * 7), 3)).concat(week(W0, 2));
  const r = computeRhythm(sessions, goal(3, start), 3, TODAY);
  expect(r.status).toBe('active');
  expect(r.streakWeeks).toBe(6);
  expect(r.thisWeek.length).toBe(2);
  expect(r.completedWeeks[0].weekStart).toBe(addDays(W0, -7));
});

test('completing this week adds one; extras add nothing', () => {
  const start = addDays(W0, -7);
  const r = computeRhythm([...week(start, 3), ...week(W0, 4)], goal(3, start), 3, TODAY);
  expect(r.status).toBe('complete');
  expect(r.streakWeeks).toBe(2);
});

test('a week ending below goal resets → comeback, history kept', () => {
  const start = addDays(W0, -21);
  const s = [...week(start, 3), ...week(addDays(start, 7), 3), ...week(addDays(start, 14), 1), ...week(W0, 1)];
  const r = computeRhythm(s, goal(3, start), 3, TODAY);
  expect(r.streakWeeks).toBe(0);
  expect(r.longestStreak).toBe(2);
  expect(r.status).toBe('comeback');
  expect(r.completedWeeks.length).toBe(2);
});

test('pause protects; resume restarts next Monday (pausedUntil)', () => {
  const start = addDays(W0, -21);
  const sessions = [...week(start, 3), ...week(addDays(start, 7), 3)];
  const paused = withPause(goal(3, start), addDays(start, 14));
  const p = computeRhythm(sessions, paused, 3, TODAY);
  expect(p.status).toBe('paused');
  expect(p.paused).toBe(true);
  expect(p.pausedUntil).toBe(null); // open-ended
  expect(p.streakWeeks).toBe(2);

  const resumed = withResume(paused, TODAY);
  const r = computeRhythm(sessions, resumed, 3, TODAY);
  expect(r.pausedUntil).toBe('2026-11-02');
  expect(r.streakWeeks).toBe(2);
  const next = computeRhythm([...sessions, ...week('2026-11-02', 3)], resumed, 3, '2026-11-05');
  expect(next.status).toBe('complete');
  expect(next.streakWeeks).toBe(3);
});

test('changing a running goal applies next Monday; old weeks keep their goal', () => {
  const start = addDays(W0, -7);
  const s = withWeeklyGoal(goal(3, start), 4, TODAY);
  expect(s.goals.map((g) => g.fromWeek)).toEqual([start, '2026-11-02']);
  const r = computeRhythm([...week(start, 3), ...week(W0, 3)], s, 3, TODAY);
  expect(r.goal).toBe(3);
  expect(r.streakWeeks).toBe(2); // last week still judged at 3
  expect(r.upcomingGoal?.weeklyGoal).toBe(4);
});

test('first goal can start next Monday → scheduled', () => {
  const r = computeRhythm([], withWeeklyGoal(EMPTY_STATE, 3, TODAY, { startNextMonday: true }), 3, TODAY);
  expect(r.status).toBe('scheduled');
});

test('parseState drops junk', () => {
  expect(parseState({ goals: [{ weeklyGoal: 99, fromWeek: '2026-10-28' }, null], pauses: 'x' })).toEqual({
    goals: [{ weeklyGoal: 7, fromWeek: '2026-10-26' }],
    pauses: [],
  });
  expect(parseState(undefined)).toEqual(EMPTY_STATE);
});
