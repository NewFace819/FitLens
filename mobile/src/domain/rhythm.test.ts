/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRhythm,
  EMPTY_SETTINGS,
  pauseGoal,
  resumeGoal,
  setWeeklyGoal,
  normalizeSettings,
  type CompletedSession,
  type RhythmSettings,
} from './rhythm.ts';
import { addDays, weekStart, nextMonday } from './dates.ts';

// Thursday 2026-10-29 → week of Mon 2026-10-26.
const TODAY = '2026-10-29';
const W0 = '2026-10-26';
const at = (day: string, hour = 18): CompletedSession => ({
  id: `${day}-${hour}`,
  name: 'Workout',
  completedAt: `${day}T${String(hour).padStart(2, '0')}:00:00`,
});
/** n sessions on consecutive days starting at the Monday of `monday`. */
const week = (monday: string, n: number) => Array.from({ length: n }, (_, i) => at(addDays(monday, i)));
const goal = (n: number, from: string): RhythmSettings => ({ goals: [{ sessionsPerWeek: n, effectiveWeek: from }], pauses: [] });

test('week helpers', () => {
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // Sunday → previous Monday
  assert.equal(weekStart('2026-10-26'), '2026-10-26');
  assert.equal(nextMonday('2026-10-29'), '2026-11-02');
});

test('no goal → empty', () => {
  const r = computeRhythm(week(W0, 2), EMPTY_SETTINGS, TODAY);
  assert.equal(r.status, 'empty');
  assert.equal(r.streak, 0);
  assert.equal(r.sessionsRecorded, 2);
});

test('first goal starts this week, or next Monday when asked', () => {
  assert.equal(setWeeklyGoal(EMPTY_SETTINGS, 3, TODAY).goals[0].effectiveWeek, W0);
  const later = setWeeklyGoal(EMPTY_SETTINGS, 3, TODAY, { startNextMonday: true });
  assert.equal(later.goals[0].effectiveWeek, '2026-11-02');
  const r = computeRhythm([], later, TODAY);
  assert.equal(r.status, 'scheduled');
  assert.equal(r.thisWeek.goal, 3);
});

test('six completed weeks + 2 of 3 this week → active, streak 6', () => {
  const start = addDays(W0, -42);
  const sessions = [0, 1, 2, 3, 4, 5].flatMap((i) => week(addDays(start, i * 7), 3)).concat(week(W0, 2));
  const r = computeRhythm(sessions, goal(3, start), TODAY);
  assert.equal(r.status, 'active');
  assert.equal(r.streak, 6);
  assert.equal(r.thisWeek.sessions.length, 2);
  assert.equal(r.completedWeeks.length, 6);
  assert.equal(r.completedWeeks[0].weekStart, addDays(W0, -7)); // most recent first
});

test('completing this week adds one immediately; extra sessions do not add more', () => {
  const start = addDays(W0, -7);
  const r = computeRhythm(week(start, 3).concat(week(W0, 4)), goal(3, start), TODAY);
  assert.equal(r.status, 'complete');
  assert.equal(r.streak, 2);
});

test('a week ending below goal resets the streak → comeback', () => {
  const start = addDays(W0, -21);
  const sessions = week(start, 3).concat(week(addDays(start, 7), 3), week(addDays(start, 14), 1), week(W0, 1));
  const r = computeRhythm(sessions, goal(3, start), TODAY);
  assert.equal(r.streak, 0);
  assert.equal(r.longestStreak, 2);
  assert.equal(r.status, 'comeback');
  assert.equal(r.completedWeeks.length, 2); // history stays
});

test('paused weeks protect the streak without adding', () => {
  const start = addDays(W0, -21);
  let s = goal(3, start);
  s = pauseGoal(s, addDays(start, 14)); // pause in week 3 (no sessions that week)
  const sessions = week(start, 3).concat(week(addDays(start, 7), 3));
  const paused = computeRhythm(sessions.concat(week(W0, 1)), s, TODAY);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.streak, 2);

  // Resume today → this week still protected, goal back next Monday.
  const resumed = resumeGoal(s, TODAY);
  assert.equal(resumed.pauses[0].toWeek, '2026-11-02');
  const r = computeRhythm(sessions, resumed, TODAY);
  assert.equal(r.status, 'paused');
  assert.equal(r.streak, 2);

  const nextWeek = computeRhythm(sessions.concat(week('2026-11-02', 3)), resumed, '2026-11-05');
  assert.equal(nextWeek.status, 'complete');
  assert.equal(nextWeek.streak, 3);
});

test('changing a running goal applies next Monday', () => {
  const start = addDays(W0, -7);
  const s = setWeeklyGoal(goal(3, start), 2, TODAY);
  assert.deepEqual(s.goals.map((g) => g.effectiveWeek), [start, '2026-11-02']);
  const r = computeRhythm(week(W0, 2), s, TODAY);
  assert.equal(r.thisWeek.goal, 3); // this week judged by the old goal
  assert.equal(r.upcomingGoal?.sessionsPerWeek, 2);
});

test('normalizeSettings drops junk', () => {
  const s = normalizeSettings({ goals: [{ sessionsPerWeek: 99, effectiveWeek: '2026-10-28' }, null, { x: 1 }], pauses: 'no' });
  assert.deepEqual(s, { goals: [{ sessionsPerWeek: 7, effectiveWeek: '2026-10-26' }], pauses: [] });
  assert.deepEqual(normalizeSettings(null), EMPTY_SETTINGS);
});
