/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReview, hasPainSignal, moodAfterReview, parseReview, scoreToFeedback,
  suggestAdjustments, weeklyLoadAdjust, type ReviewDraft,
} from './review-model.ts';

const draft = (over: Partial<ReviewDraft> = {}): ReviewDraft => ({
  historyId: 'hs-1', rpe: 5, discomfort: [], scores: {}, note: '', ...over,
});

test('feedback scale: 1 too easy, 5 just right, 10 painful', () => {
  assert.deepEqual([1, 3, 4, 5, 6, 7, 9, 10].map(scoreToFeedback),
    ['tooEasy', 'tooEasy', 'justRight', 'justRight', 'justRight', 'tooHard', 'tooHard', 'painful']);
  assert.equal(scoreToFeedback(42), 'painful');
  assert.equal(scoreToFeedback(NaN), 'justRight');
});

test('buildReview produces the contract shape', () => {
  const r = buildReview(draft({
    rpe: 14,
    note: '  ok  ',
    discomfort: [
      { region: 'shoulders', sensation: 'soreness', exerciseId: 'push-up' },
      { region: 'shoulders', sensation: 'pain', exerciseId: null }, // duplicate region dropped
    ],
    scores: { 'push-up': 8, 'plank': 2 },
  }), new Date('2026-11-14T10:00:00Z'));
  assert.match(r.id, /^rv-/);
  assert.equal(r.historyId, 'hs-1');
  assert.equal(r.rpe, 10);
  assert.deepEqual(r.discomfortRegions, ['shoulders']);
  assert.deepEqual(r.exerciseFeedback, [
    { exerciseId: 'push-up', score: 8, feedback: 'tooHard' },
    { exerciseId: 'plank', score: 2, feedback: 'tooEasy' },
  ]);
  assert.equal(r.note, 'ok');
  assert.equal(r.createdAt, '2026-11-14T10:00:00.000Z');
  assert.throws(() => buildReview(draft({ historyId: '' })));
  assert.deepEqual(parseReview(JSON.parse(JSON.stringify(r))), r);
});

test('pain signals: sensation, score 10, or stopped by pain', () => {
  assert.equal(hasPainSignal(draft({ scores: { a: 10 } })), true);
  assert.equal(hasPainSignal(draft({ discomfort: [{ region: 'knees', sensation: 'pain', exerciseId: null }] })), true);
  assert.equal(hasPainSignal(draft(), true), true);
  assert.equal(hasPainSignal(draft({ scores: { a: 9 } })), false);
  assert.equal(moodAfterReview(draft({ rpe: 9 })), 'tired');
  assert.equal(moodAfterReview(draft({ scores: { a: 10 } })), 'concerned');
});

test('adjustments are conservative; load adjust stays in −30%…+10%', () => {
  const easy = buildReview(draft({ rpe: 4, scores: { row: 2, push: 2 } }));
  const hurt = buildReview(draft({ rpe: 6, scores: { push: 10 } }));
  const s = suggestAdjustments([hurt, easy]);
  assert.equal(s.get('row'), 'harder');
  assert.equal(s.get('push'), 'swap');
  assert.equal(weeklyLoadAdjust([easy]), 0.1);
  assert.equal(weeklyLoadAdjust([hurt]), -0.3);
  assert.equal(weeklyLoadAdjust([buildReview(draft({ rpe: 9 }))]), -0.2);
  assert.equal(weeklyLoadAdjust([easy], 1), -0.3);
  assert.equal(weeklyLoadAdjust([]), 0);
});
