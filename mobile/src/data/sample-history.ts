/**
 * Synthetic history so Rhythm and Check-in can be demoed before real sessions
 * exist (task: "tính từ lịch sử mẫu"). Dates are relative to today so the demo
 * always shows a live streak. Never real user data.
 */
import { addDays, toDateKey, weekStart } from '../domain/dates.ts';
import type { RhythmSettings } from '../domain/rhythm.ts';
import type { TrainingSession } from './training-history.ts';

const UPPER = [
  { id: 'bench-press', name: 'Bench Press' },
  { id: 'lat-pulldown', name: 'Lat Pulldown' },
  { id: 'seated-row', name: 'Seated Row' },
  { id: 'shoulder-press', name: 'Shoulder Press' },
  { id: 'lateral-raise', name: 'Lateral Raise' },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown' },
];
const LOWER = [
  { id: 'goblet-squat', name: 'Goblet Squat' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift' },
  { id: 'leg-press', name: 'Leg Press' },
  { id: 'leg-curl', name: 'Leg Curl' },
  { id: 'calf-raise', name: 'Calf Raise' },
];
const FULL = [UPPER[0], LOWER[0], LOWER[1], UPPER[1], UPPER[3]];

export const SAMPLE_ROUTINES = {
  upper: { name: 'Upper body', exercises: UPPER },
  lower: { name: 'Lower body', exercises: LOWER },
  full: { name: 'A gentle full body', exercises: FULL },
} as const;
export type RoutineKey = keyof typeof SAMPLE_ROUTINES;

function session(id: string, routine: RoutineKey, day: string, minutes = 45): TrainingSession {
  const r = SAMPLE_ROUTINES[routine];
  return {
    id,
    name: r.name,
    routine,
    completedAt: `${day}T18:${String(minutes % 60).padStart(2, '0')}:00`,
    durationMinutes: minutes,
    exercises: r.exercises.map((e) => ({ ...e, sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 22.5, reps: 8 }] })),
  };
}

/** Six completed weeks of 3 sessions, plus 2 done this week (→ "2 of 3", 6 in a row). */
export function sampleHistory(today: Date = new Date()): { sessions: TrainingSession[]; settings: RhythmSettings } {
  const thisMonday = weekStart(toDateKey(today));
  const firstMonday = addDays(thisMonday, -42);
  const sessions: TrainingSession[] = [];
  for (let w = 0; w < 6; w++) {
    const monday = addDays(firstMonday, w * 7);
    sessions.push(
      session(`sample-${w}-a`, 'upper', monday),
      session(`sample-${w}-b`, 'full', addDays(monday, 1), 38),
      session(`sample-${w}-c`, 'lower', addDays(monday, 2)),
    );
  }
  const todayKey = toDateKey(today);
  for (const [i, routine] of (['upper', 'full'] as const).entries()) {
    const day = addDays(thisMonday, i);
    if (day <= todayKey) sessions.push(session(`sample-now-${i}`, routine, day));
  }
  return { sessions, settings: { goals: [{ sessionsPerWeek: 3, effectiveWeek: firstMonday }], pauses: [] } };
}
