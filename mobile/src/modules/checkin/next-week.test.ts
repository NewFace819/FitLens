/**
 * #28 load adjustment + reason for the Plan, #29 pain → safer next plan.
 */
import type { Region } from '../../shared/constants';
import { addDays, weekStartOf } from '../../shared/dates';
import { resetSampleData } from '../../shared/seed';
import { hydrate, KEYS, write } from '../../shared/storage';
import { getHistory } from '../history/history';
import { getExercise } from '../workouts/exercises';
import { getStore } from '../workouts/store';
import type { Profile } from '../workouts/types';
import { getLoadAdjustForWeek, submitCheckIn } from './checkin';
import { explainLoadAdjust, getNextWeekAdjustment, painAreas, regionList, withNextWeekAvoid } from './next-week';
import { buildReview, weeklyLoadAdjust, type ReviewDraft } from './review-model';

const WM = require('../../../../prototype/workout-model.js');

const review = (over: Partial<ReviewDraft> = {}, historyId = 'hs-1') =>
  buildReview({ historyId, rpe: 5, discomfort: [], scores: {}, note: '', ...over });

describe('explainLoadAdjust (#28)', () => {
  test('no data → no change', () => {
    expect(explainLoadAdjust([])).toEqual({ loadAdjust: 0, reason: null, message: 'No check-ins last week yet, so nothing changes.' });
  });

  test('high RPE → lighter, with the average in the reason', () => {
    expect(explainLoadAdjust([review({ rpe: 9 }), review({ rpe: 10 })])).toEqual({
      loadAdjust: -0.2, reason: 'hard', message: 'Last week felt very hard (average effort 9.5/10).',
    });
    expect(explainLoadAdjust([review({ rpe: 8 })])).toMatchObject({ loadAdjust: -0.1, reason: 'hard' });
  });

  test('low RPE → a bit more, unless something felt too hard', () => {
    expect(explainLoadAdjust([review({ rpe: 3 }), review({ rpe: 4 })])).toEqual({
      loadAdjust: 0.1, reason: 'easy', message: 'Last week felt easy (average effort 3.5/10).',
    });
    expect(explainLoadAdjust([review({ rpe: 3, scores: { 'goblet-squat': 8 } })])).toMatchObject({ loadAdjust: 0, reason: null });
  });

  test('mixed week averages out → no change', () => {
    expect(explainLoadAdjust([review({ rpe: 3 }), review({ rpe: 9 })])).toEqual({
      loadAdjust: 0, reason: null, message: 'Last week’s effort looked about right, so nothing changes.',
    });
  });

  test('pain wins over everything, even a pain stop with no check-in', () => {
    expect(explainLoadAdjust([review({ rpe: 2 })], 1)).toMatchObject({ loadAdjust: -0.3, reason: 'pain' });
    expect(explainLoadAdjust([], 1)).toEqual({ loadAdjust: -0.3, reason: 'pain', message: 'You reported pain last week.' });
    expect(explainLoadAdjust([review({ scores: { 'bench-press': 10 } })], 0, ['knees', 'back'])).toEqual({
      loadAdjust: -0.3, reason: 'pain', message: 'You reported pain in your knees and back last week.',
    });
  });

  test('same numbers as weeklyLoadAdjust whenever there are reviews', () => {
    for (const rpe of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const rs = [review({ rpe })];
      expect(explainLoadAdjust(rs).loadAdjust).toBe(weeklyLoadAdjust(rs));
    }
  });

  test('regionList reads naturally', () => {
    expect(regionList([])).toBe('');
    expect(regionList(['knees'])).toBe('knees');
    expect(regionList(['knees', 'back', 'hips'])).toBe('knees, back and hips');
  });
});

describe('painAreas (#29)', () => {
  const regionsOf = (id: string): Region[] => (id === 'goblet-squat' ? ['knees', 'hips', 'ankles'] : id === 'bench-press' ? ['shoulders', 'wrists'] : []);

  test('no pain → nothing to avoid; soreness alone is not pain', () => {
    const r = review({ discomfort: [{ region: 'back', sensation: 'soreness', exerciseId: null }] });
    expect(painAreas([{ id: 'hs-1', stoppedByPain: false }], [r], regionsOf)).toEqual({ regions: [], exercises: [] });
  });

  test('the area the user marked as pain, not every area of the exercise', () => {
    const r = review({ discomfort: [{ region: 'knees', sensation: 'pain', exerciseId: 'goblet-squat' }] });
    expect(painAreas([{ id: 'hs-1', stoppedByPain: false }], [r], regionsOf)).toEqual({ regions: ['knees'], exercises: ['goblet-squat'] });
  });

  test('pain stop: every area noted in its check-in counts', () => {
    const r = review({ discomfort: [{ region: 'back', sensation: 'unsure', exerciseId: null }] });
    expect(painAreas([{ id: 'hs-1', stoppedByPain: true }], [r], regionsOf).regions).toEqual(['back']);
  });

  test('pain without an area falls back to the areas of the exercise that hurt', () => {
    const rated = review({ scores: { 'bench-press': 10 } });
    expect(painAreas([{ id: 'hs-1', stoppedByPain: false }], [rated], regionsOf)).toEqual({ regions: ['wrists', 'shoulders'], exercises: ['bench-press'] });
    // Pain stop with no check-in at all: the exercise shown when it stopped.
    expect(painAreas([{ id: 'hs-2', stoppedByPain: true, stoppedExerciseId: 'goblet-squat' }], [], regionsOf).regions).toEqual(['knees', 'ankles', 'hips']);
    // Nothing known at all: no area, the load still drops (see explainLoadAdjust).
    expect(painAreas([{ id: 'hs-3', stoppedByPain: true }], [], regionsOf)).toEqual({ regions: [], exercises: [] });
  });

  test('reviews of other sessions are ignored', () => {
    const r = review({ discomfort: [{ region: 'knees', sensation: 'pain', exerciseId: null }] }, 'hs-other');
    expect(painAreas([{ id: 'hs-1', stoppedByPain: false }], [r], regionsOf).regions).toEqual([]);
  });

  test('withNextWeekAvoid adds areas, keeps the profile ones, and does not change the input', () => {
    const profile = { goal: 'habit', avoidRegions: ['back'] as Region[] };
    expect(withNextWeekAvoid(profile, { avoidRegions: ['knees', 'back'] }).avoidRegions).toEqual(['back', 'knees']);
    expect(profile.avoidRegions).toEqual(['back']);
  });
});

describe('from storage: pain in a workout → a safer next plan', () => {
  // Thursday 2026-11-12, 10:00 local (same clock as contract.test).
  const NOW = new Date(2026, 10, 12, 10, 0);
  const MONDAY = weekStartOf('2026-11-12');
  const NEXT = addDays(MONDAY, 7);

  beforeEach(async () => {
    await hydrate(null);
    resetSampleData(NOW);
  });

  const regionsOfWorkout = (workoutId: string): string[] => WM.regionsOf(getStore().getWorkout(workoutId));
  const profile: Partial<Profile> = { goal: 'habit', daysPerWeek: 3, minutes: 30, equipment: [], avoidRegions: [] };

  test('sample history with no check-ins → no change', () => {
    expect(getNextWeekAdjustment(NEXT)).toMatchObject({ loadAdjust: 0, reason: null, avoidRegions: [] });
    expect(getLoadAdjustForWeek(NEXT)).toBe(0);
  });

  test('a pain stop this week with knee pain in the check-in avoids knees next week', () => {
    const entry = { id: 'hs-pain', sessionId: null, workoutId: 'tpl-lower-plan', date: addDays(MONDAY, 1), durationSec: 300, stoppedByPain: true, sets: [{ exerciseId: 'chair-squat', kg: null, reps: 6 }] };
    write(KEYS.history, [entry, ...getHistory()]);
    submitCheckIn({ historyId: 'hs-pain', rpe: 6, discomfort: [{ region: 'knees', sensation: 'pain', exerciseId: 'chair-squat' }], scores: {}, note: '' }, true, NOW);

    const adj = getNextWeekAdjustment(NEXT);
    expect(adj).toEqual({
      loadAdjust: -0.3,
      reason: 'pain',
      message: 'You reported pain in your knees last week.',
      avoidRegions: ['knees'],
      avoidExercises: ['chair-squat'],
    });
    expect(getLoadAdjustForWeek(NEXT)).toBe(-0.3);
    // Only the week right after: the week after that is back to normal.
    expect(getNextWeekAdjustment(addDays(NEXT, 7)).avoidRegions).toEqual([]);

    // Before: the usual week for this profile loads the knees. After: no session does.
    const before = getStore().generateDraft(profile, NEXT);
    expect(before!.sessions.some((s) => regionsOfWorkout(s.workoutId).includes('knees'))).toBe(true);
    const after = getStore().generateDraft(withNextWeekAvoid(profile, adj), NEXT);
    expect(after).not.toBeNull();
    expect(after!.sessions.length).toBeGreaterThan(0);
    for (const s of after!.sessions) expect(regionsOfWorkout(s.workoutId)).not.toContain('knees');
  });

  test('a pain stop with the check-in skipped still lowers the load', () => {
    const entry = { id: 'hs-stop', sessionId: null, workoutId: 'tpl-core', date: addDays(MONDAY, 2), durationSec: 120, stoppedByPain: true, sets: [] };
    write(KEYS.history, [entry, ...getHistory()]);
    expect(getNextWeekAdjustment(NEXT)).toMatchObject({ loadAdjust: -0.3, reason: 'pain' });
  });

  test('every exercise used here exists in the catalogue', () => {
    expect(getExercise('chair-squat')?.regions).toContain('knees');
  });
});
