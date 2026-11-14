/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_REMINDER, notificationPlan, parseReminders, resolveReminder, type Reminder } from './reminder-model.ts';

const def: Reminder = { id: 'rm-default', sessionId: null, enabled: true, minutesBefore: 15 };
const own: Reminder = { id: 'rm-a', sessionId: 'ss-2', enabled: false, minutesBefore: 0 };

test('session reminder → default → built-in default', () => {
  assert.equal(resolveReminder([def, own], 'ss-2'), own);
  assert.equal(resolveReminder([def, own], 'ss-9'), def);
  assert.equal(resolveReminder([], 'ss-9'), DEFAULT_REMINDER);
});

test('parseReminders keeps one per session and valid leads', () => {
  const list = parseReminders([def, { ...def, id: 'dup' }, { id: 'rm-x', sessionId: 'ss-1', enabled: true, minutesBefore: 20 }, null]);
  assert.equal(list.length, 2);
  assert.equal(list[1].minutesBefore, 15);
});

test('notification plan: planned + timed + enabled + future only', () => {
  const now = new Date(2026, 10, 14, 12, 0);
  const sessions = [
    { id: 'ss-1', date: '2026-11-14', time: '18:00', status: 'planned', title: 'Upper body' },
    { id: 'ss-2', date: '2026-11-15', time: '07:00', status: 'planned', title: 'Lower body' }, // own reminder off
    { id: 'ss-3', date: '2026-11-14', time: '12:10', status: 'planned', title: 'Full' }, // 11:55 already passed
    { id: 'ss-4', date: '2026-11-16', time: null, status: 'planned', title: 'No time' },
    { id: 'ss-5', date: '2026-11-16', time: '09:00', status: 'done', title: 'Done' },
  ];
  const plan = notificationPlan(sessions, [def, own], now);
  assert.deepEqual(plan.map((p) => p.sessionId), ['ss-1']);
  assert.equal(plan[0].at.getHours(), 17);
  assert.equal(plan[0].at.getMinutes(), 45);
  assert.equal(plan[0].title, 'Upper body in 15 minutes');
});
