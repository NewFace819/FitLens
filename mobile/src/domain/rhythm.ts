/**
 * Rhythm model: weekly session goal, streak ("weeks in a row") and pauses.
 *
 * Rules (from the "How weeks are counted" screen, snapshot 049):
 * - A week runs Monday to Sunday. Completing the number of sessions you chose
 *   completes the week. Scheduled rest days do not use a session slot.
 * - A completed week adds one. Extra sessions do not add extra streak points.
 *   A week still in progress does not end your streak.
 * - A paused week protects the previous streak without adding a completed week.
 *   When you resume, your goal starts again the following week (next Monday).
 * - If a week ends below your goal, the consecutive count starts again.
 *   Completed weeks and sessions always stay in your history.
 *
 * Everything here is pure (no storage, no React) so it can be unit tested and
 * reused by Home / Insights.
 */
import { addDays, nextMonday, toDateKey, weekStart, type DateKey } from './dates.ts';

export const GOAL_OPTIONS = [2, 3, 4, 5] as const;
export const MIN_GOAL = 1;
export const MAX_GOAL = 7;

export type GoalChange = {
  sessionsPerWeek: number;
  /** Monday of the first week this goal applies to. */
  effectiveWeek: DateKey;
};

export type PausePeriod = {
  /** Monday of the first paused week. */
  fromWeek: DateKey;
  /** Monday the goal resumes (exclusive). `null` while still paused. */
  toWeek: DateKey | null;
};

export type RhythmSettings = {
  goals: GoalChange[];
  pauses: PausePeriod[];
};

/** Minimal view of a finished session. Full shape is owned by training history. */
export type CompletedSession = {
  id: string;
  name: string;
  /** ISO timestamp when the session was finished. */
  completedAt: string;
};

export type RhythmStatus =
  | 'empty' // no goal yet
  | 'scheduled' // goal set, starts on a future Monday
  | 'active' // goal running, this week not complete yet
  | 'complete' // this week's goal reached
  | 'paused' // this week is paused
  | 'comeback'; // streak was broken, starting again

export type WeekSummary = {
  weekStart: DateKey;
  goal: number;
  sessions: CompletedSession[];
};

export type Rhythm = {
  status: RhythmStatus;
  today: DateKey;
  thisWeek: WeekSummary & { paused: boolean };
  /** Consecutive completed weeks (current week included once complete). */
  streak: number;
  longestStreak: number;
  /** Most recent first. */
  completedWeeks: WeekSummary[];
  sessionsRecorded: number;
  /** A goal change waiting for a future Monday, if any. */
  upcomingGoal: GoalChange | null;
};

export const EMPTY_SETTINGS: RhythmSettings = { goals: [], pauses: [] };

const clampGoal = (n: number) => Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(n)));

/** Drops malformed data coming back from storage. */
export function normalizeSettings(raw: unknown): RhythmSettings {
  const value = (raw ?? {}) as Partial<RhythmSettings>;
  const goals = Array.isArray(value.goals)
    ? value.goals
        .filter((g) => g && typeof g.effectiveWeek === 'string' && Number.isFinite(g.sessionsPerWeek))
        .map((g) => ({ sessionsPerWeek: clampGoal(g.sessionsPerWeek), effectiveWeek: weekStart(g.effectiveWeek) }))
        .sort((a, b) => a.effectiveWeek.localeCompare(b.effectiveWeek))
    : [];
  const pauses = Array.isArray(value.pauses)
    ? value.pauses
        .filter((p) => p && typeof p.fromWeek === 'string')
        .map((p) => ({ fromWeek: weekStart(p.fromWeek), toWeek: typeof p.toWeek === 'string' ? weekStart(p.toWeek) : null }))
        .sort((a, b) => a.fromWeek.localeCompare(b.fromWeek))
    : [];
  return { goals, pauses };
}

export function goalForWeek(settings: RhythmSettings, monday: DateKey): number | null {
  let goal: number | null = null;
  for (const g of settings.goals) if (g.effectiveWeek <= monday) goal = g.sessionsPerWeek;
  return goal;
}

export function isPausedWeek(settings: RhythmSettings, monday: DateKey): boolean {
  return settings.pauses.some((p) => p.fromWeek <= monday && (p.toWeek === null || monday < p.toWeek));
}

/** Upsert a goal starting at `effectiveWeek`, dropping any later goal changes. */
function withGoal(settings: RhythmSettings, sessionsPerWeek: number, effectiveWeek: DateKey): RhythmSettings {
  const goals = settings.goals.filter((g) => g.effectiveWeek < effectiveWeek);
  goals.push({ sessionsPerWeek: clampGoal(sessionsPerWeek), effectiveWeek });
  return { ...settings, goals };
}

/**
 * First goal (snapshots 041–043): starts this week, or next Monday if asked.
 * Changing an existing goal (snapshot 045) always applies from next Monday so
 * the week in progress is judged by the goal it started with.
 */
export function setWeeklyGoal(
  settings: RhythmSettings,
  sessionsPerWeek: number,
  today: DateKey,
  options: { startNextMonday?: boolean } = {},
): RhythmSettings {
  const thisWeek = weekStart(today);
  const hasRunningGoal = goalForWeek(settings, thisWeek) !== null;
  const effectiveWeek = hasRunningGoal || options.startNextMonday ? nextMonday(today) : thisWeek;
  return withGoal(settings, sessionsPerWeek, effectiveWeek);
}

/** Pause from this week on (snapshot 046). No-op if already paused. */
export function pauseGoal(settings: RhythmSettings, today: DateKey): RhythmSettings {
  const thisWeek = weekStart(today);
  if (isPausedWeek(settings, thisWeek)) return settings;
  return { ...settings, pauses: [...settings.pauses, { fromWeek: thisWeek, toWeek: null }] };
}

/** Resume (snapshot 048): this week stays protected, the goal restarts next Monday. */
export function resumeGoal(settings: RhythmSettings, today: DateKey): RhythmSettings {
  const resumeAt = nextMonday(today);
  return {
    ...settings,
    pauses: settings.pauses.map((p) => (p.toWeek === null || p.toWeek > resumeAt ? { ...p, toWeek: resumeAt } : p)),
  };
}

/** True when the current pause is open-ended (user has not tapped Resume yet). */
export function isPauseOpen(settings: RhythmSettings, today: DateKey): boolean {
  const thisWeek = weekStart(today);
  return settings.pauses.some((p) => p.fromWeek <= thisWeek && p.toWeek === null);
}

function groupByWeek(sessions: CompletedSession[]): Map<DateKey, CompletedSession[]> {
  const byWeek = new Map<DateKey, CompletedSession[]>();
  for (const s of sessions) {
    const parsed = new Date(s.completedAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const monday = weekStart(toDateKey(parsed));
    const list = byWeek.get(monday) ?? [];
    list.push(s);
    byWeek.set(monday, list);
  }
  for (const list of byWeek.values()) list.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return byWeek;
}

export function computeRhythm(sessions: CompletedSession[], settings: RhythmSettings, today: DateKey): Rhythm {
  const thisWeek = weekStart(today);
  const byWeek = groupByWeek(sessions);
  const sessionsThisWeek = byWeek.get(thisWeek) ?? [];
  const currentGoal = goalForWeek(settings, thisWeek);
  const pausedNow = isPausedWeek(settings, thisWeek);
  const upcomingGoal = settings.goals.find((g) => g.effectiveWeek > thisWeek) ?? null;

  let streak = 0;
  let longestStreak = 0;
  let brokenBefore = false;
  const completed: WeekSummary[] = [];
  const firstWeek = settings.goals[0]?.effectiveWeek;

  if (firstWeek && firstWeek <= thisWeek) {
    for (let monday = firstWeek; monday <= thisWeek; monday = addDays(monday, 7)) {
      const goal = goalForWeek(settings, monday);
      if (goal === null || isPausedWeek(settings, monday)) continue;
      const weekSessions = byWeek.get(monday) ?? [];
      if (weekSessions.length >= goal) {
        streak += 1;
        longestStreak = Math.max(longestStreak, streak);
        completed.push({ weekStart: monday, goal, sessions: weekSessions });
      } else if (monday < thisWeek) {
        if (streak > 0) brokenBefore = true;
        streak = 0;
      }
    }
  }

  const thisWeekComplete = completed.length > 0 && completed[completed.length - 1].weekStart === thisWeek;

  let status: RhythmStatus;
  if (settings.goals.length === 0) status = 'empty';
  else if (currentGoal === null) status = 'scheduled';
  else if (pausedNow) status = 'paused';
  else if (thisWeekComplete) status = 'complete';
  else if (streak === 0 && (brokenBefore || completed.length > 0)) status = 'comeback';
  else status = 'active';

  return {
    status,
    today,
    thisWeek: {
      weekStart: thisWeek,
      goal: currentGoal ?? upcomingGoal?.sessionsPerWeek ?? 0,
      sessions: sessionsThisWeek,
      paused: pausedNow,
    },
    streak,
    longestStreak,
    completedWeeks: completed.reverse(),
    sessionsRecorded: sessions.length,
    upcomingGoal,
  };
}

/** Short line under the week card, e.g. "1 more session to meet your weekly goal." */
export function progressMessage(rhythm: Rhythm): string {
  const { status, thisWeek, upcomingGoal } = rhythm;
  const left = Math.max(0, thisWeek.goal - thisWeek.sessions.length);
  switch (status) {
    case 'empty':
      return 'Choose how many sessions you want to complete each week.';
    case 'scheduled':
      return upcomingGoal
        ? `${upcomingGoal.sessionsPerWeek} sessions, starting Monday. There is nothing to catch up on this week.`
        : '';
    case 'paused':
      return 'Your goal is paused. Your consecutive count is protected.';
    case 'complete':
      return 'Your weekly goal is complete.';
    default:
      return `${left} more ${left === 1 ? 'session' : 'sessions'} to meet your weekly goal.`;
  }
}
