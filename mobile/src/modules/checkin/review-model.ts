/**
 * Review (post-workout check-in) — OWNER of the shape: Tu.
 * Stored by Đức Huy's appendReview(). Pure: no storage, no React.
 *
 * Contract minimum (DATA_CONTRACT §9): id, historyId, rpe, discomfortRegions,
 * exerciseFeedback[{exerciseId, feedback}]. Tu adds optional extras
 * (score, discomfort details, note, createdAt) — allowed by §7.
 */
import {
  EXERCISE_FEEDBACK, REGIONS, isOneOf,
  type ExerciseFeedback, type Region, type Rpe,
} from '../../shared/constants';
import { newId } from '../../shared/ids';

/** Sensation for a discomfort region (Tu's extra detail; the region list is the contract field). */
export const SENSATIONS = ['tightness', 'soreness', 'pain', 'unsure'] as const;
export type Sensation = (typeof SENSATIONS)[number];
export const SENSATION_LABELS: Record<Sensation, string> = {
  tightness: 'Tightness',
  soreness: 'Soreness',
  pain: 'Pain',
  unsure: 'Hard to describe',
};

/** A region can feel several ways at once (e.g. tight and sore), so sensations is a set. */
export type DiscomfortDetail = { region: Region; sensations: Sensation[]; exerciseId: string | null };

/** Keep known sensations once, in SENSATIONS order. Reads the old single `sensation` field too. */
export function normalizeSensations(d: { sensations?: unknown; sensation?: unknown }): Sensation[] {
  const raw = Array.isArray(d.sensations) ? d.sensations : d.sensation != null ? [d.sensation] : [];
  return SENSATIONS.filter((s) => raw.includes(s));
}

export const feelsPain = (d: Pick<DiscomfortDetail, 'sensations'>) => d.sensations.includes('pain');

/**
 * Per-exercise feedback score 1–10 (decided by Tu, 2026-11-14):
 * 1 = too easy · 5 = just right · 10 = painful.
 * Mapped to the shared enum so other modules read `feedback`, not the number:
 * 1–3 tooEasy · 4–6 justRight · 7–9 tooHard · 10 painful.
 * 10 is a safety signal (pain), never just "a bit harder".
 */
export type FeedbackScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const DEFAULT_FEEDBACK_SCORE: FeedbackScore = 5;

export function scoreToFeedback(score: number): ExerciseFeedback {
  const s = clampScore(score);
  if (s <= 3) return 'tooEasy';
  if (s <= 6) return 'justRight';
  if (s <= 9) return 'tooHard';
  return 'painful';
}

export const FEEDBACK_LABELS: Record<ExerciseFeedback, string> = {
  tooEasy: 'Too easy',
  justRight: 'Just right',
  tooHard: 'Too hard',
  painful: 'Painful',
};

export type ExerciseFeedbackEntry = {
  exerciseId: string;
  feedback: ExerciseFeedback;
  /** 1–10, Tu's extra; `feedback` is derived from it at save time. */
  score: FeedbackScore;
};

export type Review = {
  id: string;
  historyId: string;
  rpe: Rpe;
  discomfortRegions: Region[];
  exerciseFeedback: ExerciseFeedbackEntry[];
  // ---- Tu's optional extras ----
  discomfort: DiscomfortDetail[];
  note: string;
  /** ISO 8601 UTC. */
  createdAt: string;
};

export const NOTE_MAX = 600;
export const DEFAULT_RPE: Rpe = 5;

/** RPE 1–10 copy, from the prototype review screen. */
export const EFFORT_LEVELS: ReadonlyArray<readonly [string, string]> = [
  ['Almost effortless', 'Gentle movement. Breathing feels natural and easy.'],
  ['Very light', 'Comfortable and relaxed. Plenty of energy left.'],
  ['Light', 'A little effort. You could comfortably do more.'],
  ['Steady', 'Your breathing picked up. Still comfortably in control.'],
  ['Moderate', 'A steady effort. You worked, with room to keep going.'],
  ['Hard', 'Challenging, but controlled. Your muscles felt the work.'],
  ['Very hard', 'Heavy breathing. Those last sets took real focus.'],
  ['Intense', 'A demanding session. You had very little left to give.'],
  ['Extremely hard', 'Close to your limit. Keeping going took a lot of effort.'],
  ['All-out', 'Your highest effort. You couldn’t have pushed any harder.'],
];

const clamp10 = (n: number, fallback: number) => Math.min(10, Math.max(1, Math.round(Number.isFinite(n) ? n : fallback)));
export const clampRpe = (n: number) => clamp10(n, DEFAULT_RPE) as Rpe;
export const clampScore = (n: number) => clamp10(n, DEFAULT_FEEDBACK_SCORE) as FeedbackScore;

export function effortLevel(rpe: number) {
  const [name, description] = EFFORT_LEVELS[clampRpe(rpe) - 1];
  return { name, description };
}

export type ReviewDraft = {
  historyId: string;
  rpe: number;
  discomfort: DiscomfortDetail[];
  /** exerciseId → score 1–10. Exercises the user didn't rate are left out. */
  scores: Record<string, number>;
  note: string;
};

/** Validate and shape a draft into a contract Review. Throws only without a historyId. */
export function buildReview(draft: ReviewDraft, now: Date = new Date()): Review {
  if (!draft.historyId) throw new Error('A review needs a historyId');
  const seen = new Set<Region>();
  const discomfort = draft.discomfort.filter((d) => {
    if (!isOneOf(REGIONS, d.region) || seen.has(d.region)) return false;
    seen.add(d.region);
    return true;
  }).map((d) => ({ region: d.region, sensations: normalizeSensations(d), exerciseId: d.exerciseId ?? null }));
  return {
    id: newId('rv'),
    historyId: draft.historyId,
    rpe: clampRpe(draft.rpe),
    discomfortRegions: discomfort.map((d) => d.region),
    exerciseFeedback: Object.entries(draft.scores).map(([exerciseId, s]) => {
      const score = clampScore(s);
      return { exerciseId, score, feedback: scoreToFeedback(score) };
    }),
    discomfort,
    note: draft.note.trim().slice(0, NOTE_MAX),
    createdAt: now.toISOString(),
  };
}

/** Lenient reader for stored reviews; returns null for unusable rows. */
export function parseReview(raw: unknown): Review | null {
  const r = raw as Partial<Review> | null;
  if (!r || typeof r.historyId !== 'string' || typeof r.id !== 'string') return null;
  const regions = Array.isArray(r.discomfortRegions) ? r.discomfortRegions.filter((x) => isOneOf(REGIONS, x)) : [];
  return {
    id: r.id,
    historyId: r.historyId,
    rpe: clampRpe(Number(r.rpe)),
    discomfortRegions: regions,
    exerciseFeedback: Array.isArray(r.exerciseFeedback)
      ? r.exerciseFeedback
          .filter((f) => f && typeof f.exerciseId === 'string' && isOneOf(EXERCISE_FEEDBACK, f.feedback))
          .map((f) => ({ exerciseId: f.exerciseId, feedback: f.feedback, score: clampScore(Number(f.score ?? 5)) }))
      : [],
    discomfort: Array.isArray(r.discomfort)
      ? r.discomfort
          .filter((d) => d && isOneOf(REGIONS, d.region))
          .map((d) => ({ region: d.region, sensations: normalizeSensations(d), exerciseId: typeof d.exerciseId === 'string' ? d.exerciseId : null }))
      : regions.map((region) => ({ region, sensations: [], exerciseId: null })),
    note: typeof r.note === 'string' ? r.note : '',
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(0).toISOString(),
  };
}

/** Pain anywhere → show the safety note. */
export function hasPainSignal(draft: Pick<ReviewDraft, 'discomfort' | 'scores'>, stoppedByPain = false): boolean {
  return (
    stoppedByPain ||
    draft.discomfort.some(feelsPain) ||
    Object.values(draft.scores).some((s) => clampScore(s) === 10)
  );
}

/** Mascot mood after the check-in (passed to Đỗ Huy's setMascotMood). */
export function moodAfterReview(draft: Pick<ReviewDraft, 'rpe' | 'discomfort' | 'scores'>, stoppedByPain = false) {
  if (hasPainSignal(draft, stoppedByPain) || draft.discomfort.length > 0) return 'concerned' as const;
  if (draft.rpe >= 10) return 'exhausted' as const;
  if (draft.rpe >= 8) return 'tired' as const;
  if (draft.rpe >= 6) return 'content' as const;
  return 'happy' as const;
}

export type Adjustment = 'swap' | 'easier' | 'keep' | 'harder';

/**
 * Per-exercise hint for next week's plan from recent reviews (newest first).
 * Conservative: pain → swap, too hard → easier, wins over "too easy".
 */
export function suggestAdjustments(reviews: Review[], lookback = 3): Map<string, Adjustment> {
  const rank: Record<Adjustment, number> = { swap: 3, easier: 2, harder: 1, keep: 0 };
  const result = new Map<string, Adjustment>();
  const put = (id: string, a: Adjustment) => {
    const prev = result.get(id);
    if (!prev || rank[a] > rank[prev]) result.set(id, a);
  };
  for (const r of reviews.slice(0, lookback)) {
    for (const f of r.exerciseFeedback) {
      if (f.feedback === 'painful') put(f.exerciseId, 'swap');
      else if (f.feedback === 'tooHard') put(f.exerciseId, 'easier');
      else if (f.feedback === 'tooEasy') put(f.exerciseId, r.rpe <= 7 ? 'harder' : 'keep');
      else put(f.exerciseId, 'keep');
    }
    for (const d of r.discomfort) {
      if (d.exerciseId) put(d.exerciseId, feelsPain(d) ? 'swap' : 'easier');
    }
  }
  return result;
}

/**
 * Whole-week load change for Hải's generateDraft(…, loadAdjust) — range −30%…+10%
 * (WORKOUT_SCHEDULE_DESIGN §5). Uses last week's reviews.
 */
export function weeklyLoadAdjust(lastWeekReviews: Review[], stoppedByPainCount = 0): number {
  const anyPain = stoppedByPainCount > 0 || lastWeekReviews.some((r) => r.exerciseFeedback.some((f) => f.feedback === 'painful') || r.discomfort.some(feelsPain));
  if (anyPain) return -0.3;
  if (!lastWeekReviews.length) return 0;
  const avg = lastWeekReviews.reduce((s, r) => s + r.rpe, 0) / lastWeekReviews.length;
  if (avg >= 9) return -0.2;
  if (avg >= 8) return -0.1;
  const tooHard = lastWeekReviews.some((r) => r.exerciseFeedback.some((f) => f.feedback === 'tooHard'));
  if (avg <= 4 && !tooHard) return 0.1;
  return 0;
}
