/// <reference types="node" />
/**
 * Contract-level test: Tu's functions talking to the other owners' functions
 * through the shared storage, exactly as DATA_CONTRACT §6 describes.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { hydrate, KEYS, read, write } from '../shared/storage.ts';
import { resetSampleData } from '../shared/seed.ts';
import { addDays, weekStartOf } from '../shared/dates.ts';
import { getCheckInContext, getLoadAdjustForWeek, submitCheckIn } from './checkin/checkin.ts';
import { getHistory, getReview, getReviews } from './history/history.ts';
import { getMascotMood } from './mascot/mascot.ts';
import { getReminder, pendingNotifications, setReminder } from './reminders/reminders.ts';
import { getRhythm, pauseRhythm, setWeeklyGoal } from './rhythm/rhythm.ts';
import { getWeekSchedule, updateSession } from './workouts/schedule.ts';

// Thursday 2026-11-12, 10:00 local.
const NOW = new Date(2026, 10, 12, 10, 0);
const TODAY = '2026-11-12';

beforeEach(async () => {
  await hydrate(null);
  resetSampleData(NOW);
});

test('storage uses fitlens.<entity> keys with {v, data} envelopes and never throws', () => {
  write(KEYS.rhythm, { goals: 'broken' });
  assert.equal(getRhythm(TODAY).weeklyGoal, null);
  write('fitlens.future', { a: 1 }, 2);
  assert.equal(write('fitlens.future', { a: 2 }, 1), false); // newer version is not overwritten
  assert.deepEqual(read('fitlens.future', null), { a: 1 });
});

test('getRhythm(date) from sample history: 6 in a row, goal from profile', () => {
  const r = getRhythm(TODAY);
  assert.equal(r.weeklyGoal, null);
  assert.equal(r.goal, 3);
  assert.equal(r.streakWeeks, 6);
  assert.equal(r.thisWeek.length, 2); // Mon + Wed are before Thursday
  assert.equal(r.status, 'active');
  assert.equal(setWeeklyGoal(4, {}, TODAY).upcomingGoal?.weeklyGoal, 4);
  assert.equal(pauseRhythm(TODAY).status, 'paused');
});

test('check-in: ?history=<id> → appendReview → getReview / getReviews / mascot', () => {
  const entry = getHistory()[0];
  const ctx = getCheckInContext(entry.id);
  assert.ok(ctx && ctx.exercises.length > 0);
  assert.equal(getCheckInContext('hs-missing'), null);

  const saved = submitCheckIn(
    { historyId: entry.id, rpe: 9, discomfort: [], scores: { [ctx!.exercises[0].id]: 10 }, note: '' },
    false,
    NOW,
  );
  assert.equal(getReview(entry.id)?.id, saved.id);
  assert.equal(getReviews().length, 1);
  assert.equal(saved.exerciseFeedback[0].feedback, 'painful');
  assert.equal(getMascotMood(), 'concerned');
  // Re-saving replaces, one review per history entry.
  submitCheckIn({ historyId: entry.id, rpe: 5, discomfort: [], scores: {}, note: '' }, false, NOW);
  assert.equal(getReviews().length, 1);
});

test('load adjust for next week reads last week reviews', () => {
  const monday = weekStartOf(TODAY);
  const last = getHistory({ from: addDays(monday, -7), to: addDays(monday, -1) })[0];
  submitCheckIn({ historyId: last.id, rpe: 9, discomfort: [], scores: {}, note: '' }, false, NOW);
  assert.equal(getLoadAdjustForWeek(monday), -0.2);
});

test('reminders: default for the schedule, per-session override, times from Hải', () => {
  assert.deepEqual(getReminder(null), { id: 'rm-default', sessionId: null, enabled: true, minutesBefore: 15 });
  const friday = getWeekSchedule(weekStartOf(TODAY)).find((s) => s.date === '2026-11-13')!;
  assert.equal(friday.time, null);
  assert.ok(!pendingNotifications(NOW).some((n) => n.sessionId === friday.id)); // no time → no reminder
  updateSession(friday.id, { time: '17:30' });
  setReminder(friday.id, { enabled: true, minutesBefore: 30 });
  const n = pendingNotifications(NOW).find((x) => x.sessionId === friday.id)!;
  assert.equal(n.at.getHours(), 17);
  assert.equal(n.at.getMinutes(), 0);
  assert.equal(getReminder(friday.id)?.minutesBefore, 30);
});
