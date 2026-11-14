/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReview, hasPain, moodAfterReview, suggestAdjustments, type ReviewDraft } from './checkin.ts';
import { notificationTime, normalizeReminders, toExpoWeekday } from './reminders.ts';

const draft = (over: Partial<ReviewDraft> = {}): ReviewDraft => ({
  sessionId: 's1',
  rpe: 5,
  stoppedForPain: false,
  discomfort: [],
  exerciseFeedback: [],
  note: '',
  ...over,
});

test('buildReview cleans the draft', () => {
  const r = buildReview(
    draft({
      rpe: 14,
      note: '  felt good  ',
      discomfort: [
        { area: 'leftShoulder', sensation: 'soreness', exerciseId: null },
        { area: 'leftShoulder', sensation: 'pain', exerciseId: null },
      ],
      exerciseFeedback: [
        { exerciseId: 'bench', verdict: 'none' },
        { exerciseId: 'row', verdict: 'tooEasy' },
      ],
    }),
    new Date('2026-11-14T10:00:00Z'),
  );
  assert.equal(r.rpe, 10);
  assert.equal(r.note, 'felt good');
  assert.equal(r.discomfort.length, 1);
  assert.deepEqual(r.exerciseFeedback, [{ exerciseId: 'row', verdict: 'tooEasy' }]);
  assert.equal(r.reviewedAt, '2026-11-14T10:00:00.000Z');
  assert.throws(() => buildReview(draft({ sessionId: '' })));
});

test('pain and mood', () => {
  assert.equal(hasPain(draft({ discomfort: [{ area: 'neck', sensation: 'pain', exerciseId: null }] })), true);
  assert.equal(hasPain(draft()), false);
  assert.equal(moodAfterReview(draft({ rpe: 9 })), 'tired');
  assert.equal(moodAfterReview(draft({ stoppedForPain: true })), 'concerned');
});

test('suggestAdjustments is conservative', () => {
  const r1 = buildReview(draft({ rpe: 6, exerciseFeedback: [{ exerciseId: 'row', verdict: 'tooEasy' }, { exerciseId: 'bench', verdict: 'tooEasy' }] }));
  const r2 = buildReview(draft({ rpe: 6, discomfort: [{ area: 'leftShoulder', sensation: 'pain', exerciseId: 'bench' }] }));
  const s = suggestAdjustments([r2, r1]);
  assert.equal(s.get('row'), 'harder');
  assert.equal(s.get('bench'), 'swap');
});

test('reminder times and Expo weekdays', () => {
  assert.deepEqual(notificationTime(1, { time: '00:10', enabled: true, before: 15 }), { day: 0, hour: 23, minute: 55 });
  assert.deepEqual(notificationTime(0, { time: '07:00', enabled: true, before: 0 }), { day: 0, hour: 7, minute: 0 });
  assert.equal(toExpoWeekday(0), 2); // Monday
  assert.equal(toExpoWeekday(6), 1); // Sunday
  const n = normalizeReminders([{ time: '25:00' }, { time: '07:30', enabled: true, before: 20 }]);
  assert.equal(n.length, 7);
  assert.equal(n[0], null);
  assert.deepEqual(n[1], { time: '07:30', enabled: true, before: 0 });
});
