/** Mascot mood from check-ins: only the newest session counts, and a pain stop shows even without a check-in. */
import { hydrate, KEYS, write } from '../../shared/storage';
import type { HistoryEntry } from '../history/history';
import { getMascotMood, setMascotMood } from '../mascot/mascot';
import { notePainStop, submitCheckIn } from './checkin';

const entry = (id: string, date: string, stoppedByPain = false): HistoryEntry => ({
  id, sessionId: null, workoutId: 'tpl-upper', date, durationSec: 600, stoppedByPain,
  sets: [{ exerciseId: 'bench-press', kg: 10, reps: 10 }],
});
const draft = (historyId: string, rpe: number) => ({ historyId, rpe, discomfort: [], scores: {}, note: '' });

beforeEach(async () => {
  await hydrate(null);
  write(KEYS.history, [entry('hs-new', '2026-11-27'), entry('hs-old', '2026-11-01')]);
});

describe('editing an older check-in (bug 2)', () => {
  test('saves the review but leaves the current mood alone', () => {
    submitCheckIn(draft('hs-new', 4), false);
    expect(getMascotMood()).toBe('happy');
    submitCheckIn(draft('hs-old', 10), false);
    expect(getMascotMood()).toBe('happy');
  });

  test('the newest session still sets the mood', () => {
    submitCheckIn(draft('hs-new', 10), false);
    expect(getMascotMood()).toBe('exhausted');
  });

  test('same day: the session finished last is the newest', () => {
    write(KEYS.history, [
      { ...entry('hs-am', '2026-11-27'), completedAt: '2026-11-27T02:00:00.000Z' },
      { ...entry('hs-pm', '2026-11-27'), completedAt: '2026-11-27T11:00:00.000Z' },
    ]);
    submitCheckIn(draft('hs-am', 10), false);
    expect(getMascotMood()).toBe('happy');
    submitCheckIn(draft('hs-pm', 9), false);
    expect(getMascotMood()).toBe('tired');
  });
});

describe('pain stop with the check-in skipped (bug 1)', () => {
  beforeEach(() => {
    write(KEYS.history, [entry('hs-pain', '2026-11-28', true), entry('hs-new', '2026-11-27')]);
    setMascotMood('happy');
  });

  test('opening the check-in makes the mascot concerned straight away', () => {
    notePainStop('hs-pain');
    expect(getMascotMood()).toBe('concerned');
  });

  test('not for a session without a pain stop', () => {
    write(KEYS.history, [entry('hs-ok', '2026-11-28')]);
    notePainStop('hs-ok');
    expect(getMascotMood()).toBe('happy');
  });

  test('not for an older pain stop, and not once its check-in exists', () => {
    write(KEYS.history, [entry('hs-new', '2026-11-28'), entry('hs-pain', '2026-11-20', true)]);
    notePainStop('hs-pain');
    expect(getMascotMood()).toBe('happy');

    write(KEYS.history, [entry('hs-pain', '2026-11-28', true)]);
    submitCheckIn(draft('hs-pain', 5), true); // check-in done: its own mood stands
    setMascotMood('calm');
    notePainStop('hs-pain'); // reopening the finished check-in changes nothing
    expect(getMascotMood()).toBe('calm');
  });

  test('unknown session → nothing happens', () => {
    notePainStop('hs-missing');
    expect(getMascotMood()).toBe('happy');
  });
});
