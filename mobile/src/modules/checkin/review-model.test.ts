import {
  buildReview, hasPainSignal, moodAfterReview, parseReview, scoreToFeedback,
  suggestAdjustments, weeklyLoadAdjust, type ReviewDraft,
} from './review-model';

const draft = (over: Partial<ReviewDraft> = {}): ReviewDraft => ({
  historyId: 'hs-1', rpe: 5, discomfort: [], scores: {}, note: '', ...over,
});

test('feedback scale: 1 too easy, 5 just right, 10 painful', () => {
  expect([1, 3, 4, 5, 6, 7, 9, 10].map(scoreToFeedback)).toEqual(['tooEasy', 'tooEasy', 'justRight', 'justRight', 'justRight', 'tooHard', 'tooHard', 'painful']);
  expect(scoreToFeedback(42)).toBe('painful');
  expect(scoreToFeedback(NaN)).toBe('justRight');
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
  expect(r.id).toMatch(/^rv-/);
  expect(r.historyId).toBe('hs-1');
  expect(r.rpe).toBe(10);
  expect(r.discomfortRegions).toEqual(['shoulders']);
  expect(r.exerciseFeedback).toEqual([
    { exerciseId: 'push-up', score: 8, feedback: 'tooHard' },
    { exerciseId: 'plank', score: 2, feedback: 'tooEasy' },
  ]);
  expect(r.note).toBe('ok');
  expect(r.createdAt).toBe('2026-11-14T10:00:00.000Z');
  expect(() => buildReview(draft({ historyId: '' }))).toThrow();
  expect(parseReview(JSON.parse(JSON.stringify(r)))).toEqual(r);
});

test('pain signals: sensation, score 10, or stopped by pain', () => {
  expect(hasPainSignal(draft({ scores: { a: 10 } }))).toBe(true);
  expect(hasPainSignal(draft({ discomfort: [{ region: 'knees', sensation: 'pain', exerciseId: null }] }))).toBe(true);
  expect(hasPainSignal(draft(), true)).toBe(true);
  expect(hasPainSignal(draft({ scores: { a: 9 } }))).toBe(false);
  expect(moodAfterReview(draft({ rpe: 9 }))).toBe('tired');
  expect(moodAfterReview(draft({ scores: { a: 10 } }))).toBe('concerned');
});

test('adjustments are conservative; load adjust stays in −30%…+10%', () => {
  const easy = buildReview(draft({ rpe: 4, scores: { row: 2, push: 2 } }));
  const hurt = buildReview(draft({ rpe: 6, scores: { push: 10 } }));
  const s = suggestAdjustments([hurt, easy]);
  expect(s.get('row')).toBe('harder');
  expect(s.get('push')).toBe('swap');
  expect(weeklyLoadAdjust([easy])).toBe(0.1);
  expect(weeklyLoadAdjust([hurt])).toBe(-0.3);
  expect(weeklyLoadAdjust([buildReview(draft({ rpe: 9 }))])).toBe(-0.2);
  expect(weeklyLoadAdjust([easy], 1)).toBe(-0.3);
  expect(weeklyLoadAdjust([], 1)).toBe(-0.3);
  expect(weeklyLoadAdjust([])).toBe(0);
});
