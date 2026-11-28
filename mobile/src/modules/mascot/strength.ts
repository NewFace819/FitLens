/**
 * Avatar strength level (#30) — OWNER: Tu, in Đỗ Huy's mascot module (agreed in the issue).
 * The mascot gets STRONGER, not bigger: the level shows as an "Lv N" badge; its size never changes.
 *
 * Points only grow, so the level never drops after a break (that would punish rest):
 *   10 per finished session (a workout stopped for pain is not "finished", but its sets count)
 * +  1 per recorded set (volume that is fair to bodyweight training, unlike kg)
 * + 15 per week the weekly goal was met
 * +  5 per week of the longest streak
 * No backend; derived from history and rhythm every time.
 */
import { getHistory } from '../history/history';
import { getRhythm } from '../rhythm/rhythm';

export const POINTS = { session: 10, set: 1, goalWeek: 15, streakWeek: 5 } as const;

/** Level n starts at LEVELS[n-1].min points. Tuned so a new user levels up on their 2nd full session. */
export const LEVELS = [
  { min: 0, name: 'Starter' },
  { min: 25, name: 'Steady' },
  { min: 75, name: 'Sturdy' },
  { min: 150, name: 'Strong' },
  { min: 275, name: 'Mighty' },
  { min: 450, name: 'Peak' },
] as const;
export const MAX_LEVEL = LEVELS.length;

export type StrengthInput = {
  /** Finished sessions (not stopped for pain). */
  sessions: number;
  /** Sets recorded, including sets before a pain stop. */
  sets: number;
  /** Weeks the weekly goal was met. */
  goalWeeks: number;
  longestStreak: number;
};

export type Strength = {
  level: number;
  name: string;
  points: number;
  /** Points where the next level starts; null at the top level. */
  nextAt: number | null;
  nextName: string | null;
  /** 0…1 within the current level (1 at the top level). */
  progress: number;
};

const count = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function strengthPoints(input: StrengthInput): number {
  return (
    count(input.sessions) * POINTS.session +
    count(input.sets) * POINTS.set +
    count(input.goalWeeks) * POINTS.goalWeek +
    count(input.longestStreak) * POINTS.streakWeek
  );
}

/** Pure: the level for a points total. */
export function levelFor(points: number): Strength {
  const p = count(points);
  let i = 0;
  while (i + 1 < LEVELS.length && p >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1] ?? null;
  const span = next ? next.min - LEVELS[i].min : 1;
  return {
    level: i + 1,
    name: LEVELS[i].name,
    points: p,
    nextAt: next ? next.min : null,
    nextName: next ? next.name : null,
    progress: next ? (p - LEVELS[i].min) / span : 1,
  };
}

export const strengthFrom = (input: StrengthInput): Strength => levelFor(strengthPoints(input));

/** Short line for Home: "12 points to Sturdy" or "Top level reached". */
export function strengthHint(s: Strength): string {
  return s.nextAt === null ? 'Top level reached' : `${s.nextAt - s.points} points to ${s.nextName}`;
}

/** Reads history and rhythm (synchronous, hydrated cache). Never throws on empty data. */
export function getStrength(date?: string): Strength {
  const history = getHistory();
  const rhythm = getRhythm(date);
  return strengthFrom({
    sessions: history.filter((h) => !h.stoppedByPain).length,
    sets: history.reduce((n, h) => n + h.sets.length, 0),
    goalWeeks: rhythm.completedWeeks.length,
    longestStreak: rhythm.longestStreak,
  });
}
