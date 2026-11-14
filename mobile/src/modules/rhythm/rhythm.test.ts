/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, nextMonday, weekStartOf } from '../../shared/dates.ts';
import {
  EMPTY_STATE, computeRhythm, parseState, withPause, withResume, withWeeklyGoal,
  type DoneSession, type RhythmState,
} from './rhythm-model.ts';

// Thursday 2026-10-29 → week of Monday 2026-10-26.
const TODAY = '2026-10-29';
const W0 = '2026-10-26';
const week = (monday: string, n: number): DoneSession[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${monday}-${i}`, date: addDays(monday, i), title: 'Workout' }));
const goal = (n: number, from: string): RhythmState => ({ goals: [{ weeklyGoal: n, fromWeek: from }], pauses: [] });

test('week helpers (contract §2: Monday start)', () => {
  assert.equal(weekStartOf('2026-11-01'), '2026-10-26');
  assert.equal(nextMonday('2026-10-29'), '2026-11-02');
});

test('nothing yet → empty; contract fields present', () => {
  const r = computeRhythm([], EMPTY_STATE, 3, TODAY);
  assert.equal(r.status, 'empty');
  assert.equal(r.weeklyGoal, null);
  assert.equal(r.streakWeeks, 0);
  assert.equal(r.pausedUntil, null);
});

test('weeklyGoal null → uses Profile.daysPerWeek (G8)', () => {
  const start = addDays(W0, -14);
  const r = computeRhythm([...week(start, 2), ...week(addDays(start, 7), 2), ...week(W0, 1)], EMPTY_STATE, 2, TODAY);
  assert.equal(r.goalSource, 'profile');
  assert.equal(r.goal, 2);
  assert.equal(r.streakWeeks, 2);
});

test('six weeks + 2 of 3 this week → active, streak 6 (week unit, G10)', () => {
  const start = addDays(W0, -42);
  const sessions = [0, 1, 2, 3, 4, 5].flatMap((i) => week(addDays(start, i * 7), 3)).concat(week(W0, 2));
  const r = computeRhythm(sessions, goal(3, start), 3, TODAY);
  assert.equal(r.status, 'active');
  assert.equal(r.streakWeeks, 6);
  assert.equal(r.thisWeek.length, 2);
  assert.equal(r.completedWeeks[0].weekStart, addDays(W0, -7));
});

test('completing this week adds one; extras add nothing', () => {
  const start = addDays(W0, -7);
  const r = computeRhythm([...week(start, 3), ...week(W0, 4)], goal(3, start), 3, TODAY);
  assert.equal(r.status, 'complete');
  assert.equal(r.streakWeeks, 2);
});

test('a week ending below goal resets → comeback, history kept', () => {
  const start = addDays(W0, -21);
  const s = [...week(start, 3), ...week(addDays(start, 7), 3), ...week(addDays(start, 14), 1), ...week(W0, 1)];
  const r = computeRhythm(s, goal(3, start), 3, TODAY);
  assert.equal(r.streakWeeks, 0);
  assert.equal(r.longestStreak, 2);
  assert.equal(r.status, 'comeback');
  assert.equal(r.completedWeeks.length, 2);
});

test('pause protects; resume restarts next Monday (pausedUntil)', () => {
  const start = addDays(W0, -21);
  const sessions = [...week(start, 3), ...week(addDays(start, 7), 3)];
  const paused = withPause(goal(3, start), addDays(start, 14));
  const p = computeRhythm(sessions, paused, 3, TODAY);
  assert.equal(p.status, 'paused');
  assert.equal(p.paused, true);
  assert.equal(p.pausedUntil, null); // open-ended
  assert.equal(p.streakWeeks, 2);

  const resumed = withResume(paused, TODAY);
  const r = computeRhythm(sessions, resumed, 3, TODAY);
  assert.equal(r.pausedUntil, '2026-11-02');
  assert.equal(r.streakWeeks, 2);
  const next = computeRhythm([...sessions, ...week('2026-11-02', 3)], resumed, 3, '2026-11-05');
  assert.equal(next.status, 'complete');
  assert.equal(next.streakWeeks, 3);
});

test('changing a running goal applies next Monday; old weeks keep their goal', () => {
  const start = addDays(W0, -7);
  const s = withWeeklyGoal(goal(3, start), 4, TODAY);
  assert.deepEqual(s.goals.map((g) => g.fromWeek), [start, '2026-11-02']);
  const r = computeRhythm([...week(start, 3), ...week(W0, 3)], s, 3, TODAY);
  assert.equal(r.goal, 3);
  assert.equal(r.streakWeeks, 2); // last week still judged at 3
  assert.equal(r.upcomingGoal?.weeklyGoal, 4);
});

test('first goal can start next Monday → scheduled', () => {
  const r = computeRhythm([], withWeeklyGoal(EMPTY_STATE, 3, TODAY, { startNextMonday: true }), 3, TODAY);
  assert.equal(r.status, 'scheduled');
});

test('parseState drops junk', () => {
  assert.deepEqual(parseState({ goals: [{ weeklyGoal: 99, fromWeek: '2026-10-28' }, null], pauses: 'x' }), {
    goals: [{ weeklyGoal: 7, fromWeek: '2026-10-26' }],
    pauses: [],
  });
  assert.deepEqual(parseState(undefined), EMPTY_STATE);
});
