/**
 * Rhythm — weekly goal, streak, pause. OWNER: Tu. Pure (no storage).
 *
 * Contract view (DATA_CONTRACT §9): `weeklyGoal` (null → Profile.daysPerWeek),
 * `streakWeeks` (computed: consecutive weeks meeting the goal), `pausedUntil`.
 *
 * Stored state keeps the *history* of goal changes and pauses rather than a
 * single value, so past weeks are always judged by the goal and pause that
 * applied then (changing 3 → 4 must not retro-fail old weeks). Nothing derived
 * (streak, counts) is stored.
 *
 * Rules (snapshot 049): Monday–Sunday weeks; meeting the goal adds one; extra
 * sessions add nothing; a week in progress never breaks the streak; paused
 * weeks protect the streak without adding; a finished week below goal resets it.
 */
import { addDays, isDateKey, nextMonday, weekStartOf, type DateKey } from '../../shared/dates';

export const GOAL_OPTIONS = [2, 3, 4, 5] as const;
const MIN_GOAL = 1;
const MAX_GOAL = 7;

export type GoalChange = { weeklyGoal: number; fromWeek: DateKey };
export type PausePeriod = { fromWeek: DateKey; /** Monday the goal resumes; null = still paused. */ untilWeek: DateKey | null };
export type RhythmState = { goals: GoalChange[]; pauses: PausePeriod[] };
export const EMPTY_STATE: RhythmState = { goals: [], pauses: [] };

/** A finished session as Rhythm sees it (from HistoryEntry). */
export type DoneSession = { id: string; date: DateKey; title: string };

export type RhythmStatus = 'empty' | 'scheduled' | 'active' | 'complete' | 'paused' | 'comeback';
export type WeekResult = { weekStart: DateKey; goal: number; sessions: DoneSession[] };

/** What getRhythm(date) returns: contract fields first, then Tu's extras. */
export type Rhythm = {
  weeklyGoal: number | null;
  streakWeeks: number;
  pausedUntil: DateKey | null;
  // ---- extras ----
  /** Goal used for this week (explicit or from the profile). */
  goal: number;
  goalSource: 'rhythm' | 'profile';
  paused: boolean;
  status: RhythmStatus;
  date: DateKey;
  weekStart: DateKey;
  thisWeek: DoneSession[];
  longestStreak: number;
  /** Newest first. */
  completedWeeks: WeekResult[];
  sessionsRecorded: number;
  upcomingGoal: GoalChange | null;
};

const clampGoal = (n: number) => Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(n)));

export function parseState(data: unknown): RhythmState {
  const v = (data ?? {}) as Partial<RhythmState>;
  return {
    goals: Array.isArray(v.goals)
      ? v.goals
          .filter((g) => g && isDateKey(g.fromWeek) && Number.isFinite(g.weeklyGoal))
          .map((g) => ({ weeklyGoal: clampGoal(g.weeklyGoal), fromWeek: weekStartOf(g.fromWeek) }))
          .sort((a, b) => a.fromWeek.localeCompare(b.fromWeek))
      : [],
    pauses: Array.isArray(v.pauses)
      ? v.pauses
          .filter((p) => p && isDateKey(p.fromWeek))
          .map((p) => ({ fromWeek: weekStartOf(p.fromWeek), untilWeek: isDateKey(p.untilWeek) ? weekStartOf(p.untilWeek) : null }))
          .sort((a, b) => a.fromWeek.localeCompare(b.fromWeek))
      : [],
  };
}

/** Explicit goal for a week, or null when the profile's daysPerWeek applies. */
export function explicitGoal(state: RhythmState, monday: DateKey): number | null {
  let goal: number | null = null;
  for (const g of state.goals) if (g.fromWeek <= monday) goal = g.weeklyGoal;
  return goal;
}

export function isPausedWeek(state: RhythmState, monday: DateKey): boolean {
  return state.pauses.some((p) => p.fromWeek <= monday && (p.untilWeek === null || monday < p.untilWeek));
}

export function currentPause(state: RhythmState, date: DateKey): PausePeriod | null {
  const monday = weekStartOf(date);
  return state.pauses.find((p) => p.fromWeek <= monday && (p.untilWeek === null || monday < p.untilWeek)) ?? null;
}

/**
 * First explicit goal starts this week (or next Monday if asked). Changing a
 * goal that is already running always applies from next Monday.
 */
export function withWeeklyGoal(state: RhythmState, weeklyGoal: number, date: DateKey, opts: { startNextMonday?: boolean } = {}): RhythmState {
  const running = explicitGoal(state, weekStartOf(date)) !== null;
  const fromWeek = running || opts.startNextMonday ? nextMonday(date) : weekStartOf(date);
  return { ...state, goals: [...state.goals.filter((g) => g.fromWeek < fromWeek), { weeklyGoal: clampGoal(weeklyGoal), fromWeek }] };
}

export function withPause(state: RhythmState, date: DateKey): RhythmState {
  if (isPausedWeek(state, weekStartOf(date))) return state;
  return { ...state, pauses: [...state.pauses, { fromWeek: weekStartOf(date), untilWeek: null }] };
}

/** This week stays protected; the goal resumes next Monday. */
export function withResume(state: RhythmState, date: DateKey): RhythmState {
  const resumeAt = nextMonday(date);
  return { ...state, pauses: state.pauses.map((p) => (p.untilWeek === null || p.untilWeek > resumeAt ? { ...p, untilWeek: resumeAt } : p)) };
}

export function computeRhythm(sessions: DoneSession[], state: RhythmState, profileGoal: number, date: DateKey): Rhythm {
  const thisMonday = weekStartOf(date);
  const byWeek = new Map<DateKey, DoneSession[]>();
  for (const s of sessions) {
    if (!isDateKey(s.date) || s.date > date) continue;
    const w = weekStartOf(s.date);
    byWeek.set(w, [...(byWeek.get(w) ?? []), s]);
  }
  for (const list of byWeek.values()) list.sort((a, b) => a.date.localeCompare(b.date));

  const goalFor = (monday: DateKey) => explicitGoal(state, monday) ?? clampGoal(profileGoal);
  const firstWeek = [...byWeek.keys(), ...state.goals.map((g) => g.fromWeek)].sort()[0];

  let streak = 0;
  let longest = 0;
  let broken = false;
  const completed: WeekResult[] = [];
  if (firstWeek && firstWeek <= thisMonday) {
    for (let w = firstWeek; w <= thisMonday; w = addDays(w, 7)) {
      if (isPausedWeek(state, w)) continue;
      const goal = goalFor(w);
      const done = byWeek.get(w) ?? [];
      if (done.length >= goal) {
        streak += 1;
        longest = Math.max(longest, streak);
        completed.push({ weekStart: w, goal, sessions: done });
      } else if (w < thisMonday) {
        if (streak > 0) broken = true;
        streak = 0;
      }
    }
  }

  const weeklyGoal = explicitGoal(state, thisMonday);
  const upcomingGoal = state.goals.find((g) => g.fromWeek > thisMonday) ?? null;
  const pause = currentPause(state, date);
  const thisWeekDone = completed.at(-1)?.weekStart === thisMonday;
  const hasHistory = sessions.length > 0;

  let status: RhythmStatus;
  if (pause) status = 'paused';
  else if (!hasHistory && weeklyGoal === null) status = upcomingGoal ? 'scheduled' : 'empty';
  else if (thisWeekDone) status = 'complete';
  else if (streak === 0 && (broken || completed.length > 0)) status = 'comeback';
  else status = 'active';

  return {
    weeklyGoal,
    streakWeeks: streak,
    pausedUntil: pause?.untilWeek ?? null,
    goal: status === 'scheduled' && upcomingGoal ? upcomingGoal.weeklyGoal : goalFor(thisMonday),
    goalSource: weeklyGoal === null ? 'profile' : 'rhythm',
    paused: pause !== null,
    status,
    date,
    weekStart: thisMonday,
    thisWeek: byWeek.get(thisMonday) ?? [],
    longestStreak: longest,
    completedWeeks: completed.reverse(),
    sessionsRecorded: sessions.length,
    upcomingGoal,
  };
}

export function progressMessage(r: Rhythm): string {
  const left = Math.max(0, r.goal - r.thisWeek.length);
  switch (r.status) {
    case 'empty':
      return 'Choose how many sessions you want to complete each week.';
    case 'scheduled':
      return `${r.upcomingGoal?.weeklyGoal ?? r.goal} sessions, starting Monday. There is nothing to catch up on this week.`;
    case 'paused':
      return 'Your goal is paused. Your consecutive count is protected.';
    case 'complete':
      return 'Your weekly goal is complete.';
    default:
      return `${left} more ${left === 1 ? 'session' : 'sessions'} to meet your weekly goal.`;
  }
}
