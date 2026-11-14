/**
 * Contract-level test: Tu's functions talking to the other owners' functions
 * through the shared storage, exactly as DATA_CONTRACT §6 describes.
 */
import { hydrate, KEYS, read, write } from '../shared/storage';
import { resetSampleData } from '../shared/seed';
import { addDays, weekStartOf } from '../shared/dates';
import { getCheckInContext, getLoadAdjustForWeek, submitCheckIn } from './checkin/checkin';
import { getHistory, getReview, getReviews } from './history/history';
import { getMascotMood } from './mascot/mascot';
import { getReminder, pendingNotifications, setReminder } from './reminders/reminders';
import { getRhythm, pauseRhythm, setWeeklyGoal } from './rhythm/rhythm';
import { getWeekSchedule, updateSession } from './workouts/schedule';

// Thursday 2026-11-12, 10:00 local.
const NOW = new Date(2026, 10, 12, 10, 0);
const TODAY = '2026-11-12';

beforeEach(async () => {
  await hydrate(null);
  resetSampleData(NOW);
});

test('storage uses fitlens.<entity> keys with {v, data} envelopes and never throws', () => {
  write(KEYS.rhythm, { goals: 'broken' });
  expect(getRhythm(TODAY).weeklyGoal).toBe(null);
  write('fitlens.future', { a: 1 }, 2);
  expect(write('fitlens.future', { a: 2 }, 1)).toBe(false); // newer version is not overwritten
  expect(read('fitlens.future', null)).toEqual({ a: 1 });
});

test('getRhythm(date) from sample history: 6 in a row, goal from profile', () => {
  const r = getRhythm(TODAY);
  expect(r.weeklyGoal).toBe(null);
  expect(r.goal).toBe(3);
  expect(r.streakWeeks).toBe(6);
  expect(r.thisWeek.length).toBe(2); // Mon + Wed are before Thursday
  expect(r.status).toBe('active');
  expect(setWeeklyGoal(4, {}, TODAY).upcomingGoal?.weeklyGoal).toBe(4);
  expect(pauseRhythm(TODAY).status).toBe('paused');
});

test('check-in: ?history=<id> → appendReview → getReview / getReviews / mascot', () => {
  const entry = getHistory()[0];
  const ctx = getCheckInContext(entry.id);
  expect(ctx && ctx.exercises.length > 0).toBeTruthy();
  expect(getCheckInContext('hs-missing')).toBe(null);

  const saved = submitCheckIn(
    { historyId: entry.id, rpe: 9, discomfort: [], scores: { [ctx!.exercises[0].id]: 10 }, note: '' },
    false,
    NOW,
  );
  expect(getReview(entry.id)?.id).toBe(saved.id);
  expect(getReviews().length).toBe(1);
  expect(saved.exerciseFeedback[0].feedback).toBe('painful');
  expect(getMascotMood()).toBe('concerned');
  // Re-saving replaces, one review per history entry.
  submitCheckIn({ historyId: entry.id, rpe: 5, discomfort: [], scores: {}, note: '' }, false, NOW);
  expect(getReviews().length).toBe(1);
});

test('load adjust for next week reads last week reviews', () => {
  const monday = weekStartOf(TODAY);
  const last = getHistory({ from: addDays(monday, -7), to: addDays(monday, -1) })[0];
  submitCheckIn({ historyId: last.id, rpe: 9, discomfort: [], scores: {}, note: '' }, false, NOW);
  expect(getLoadAdjustForWeek(monday)).toBe(-0.2);
});

test('reminders: default for the schedule, per-session override, times from Hải', () => {
  expect(getReminder(null)).toEqual({ id: 'rm-default', sessionId: null, enabled: true, minutesBefore: 15 });
  const friday = getWeekSchedule(weekStartOf(TODAY)).find((s) => s.date === '2026-11-13')!;
  expect(friday.time).toBe(null);
  expect(!pendingNotifications(NOW).some((n) => n.sessionId === friday.id)).toBeTruthy(); // no time → no reminder
  updateSession(friday.id, { time: '17:30' });
  setReminder(friday.id, { enabled: true, minutesBefore: 30 });
  const n = pendingNotifications(NOW).find((x) => x.sessionId === friday.id)!;
  expect(n.at.getHours()).toBe(17);
  expect(n.at.getMinutes()).toBe(0);
  expect(getReminder(friday.id)?.minutesBefore).toBe(30);
});
