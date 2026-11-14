/**
 * Post-workout check-in ("review"). Pure data + rules, no UI.
 *
 * The review is handed to `appendReview()` (training history, owned by Đức Huy)
 * and later read by the weekly plan (Hải) to adjust difficulty.
 */

export const BODY_AREAS = {
  neck: 'Neck',
  leftShoulder: 'Left shoulder',
  rightShoulder: 'Right shoulder',
  chest: 'Chest',
  abdomen: 'Abdomen',
  upperBack: 'Upper back',
  lowerBack: 'Lower back',
  leftArm: 'Left arm',
  rightArm: 'Right arm',
  leftHip: 'Left hip',
  rightHip: 'Right hip',
  leftThigh: 'Left thigh',
  rightThigh: 'Right thigh',
  leftKnee: 'Left knee',
  rightKnee: 'Right knee',
  leftLowerLeg: 'Left lower leg',
  rightLowerLeg: 'Right lower leg',
  leftFoot: 'Left foot / ankle',
  rightFoot: 'Right foot / ankle',
} as const;
export type BodyArea = keyof typeof BODY_AREAS;

export const FRONT_AREAS: BodyArea[] = [
  'neck', 'leftShoulder', 'rightShoulder', 'chest', 'abdomen', 'leftArm', 'rightArm',
  'leftHip', 'rightHip', 'leftThigh', 'rightThigh', 'leftKnee', 'rightKnee',
  'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot',
];
export const BACK_AREAS: BodyArea[] = [
  'neck', 'leftShoulder', 'rightShoulder', 'upperBack', 'lowerBack', 'leftArm', 'rightArm',
  'leftHip', 'rightHip', 'leftThigh', 'rightThigh', 'leftKnee', 'rightKnee',
  'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot',
];

export const SENSATIONS = {
  tightness: 'Tightness',
  soreness: 'Soreness',
  pain: 'Pain',
  unsure: 'Hard to describe',
} as const;
export type Sensation = keyof typeof SENSATIONS;

export const EXERCISE_VERDICTS = {
  none: 'No changes',
  form: 'Hard to keep good form',
  tooHard: 'Too demanding',
  tooEasy: 'Could use more challenge',
  alternative: 'Would like an alternative',
} as const;
export type ExerciseVerdict = keyof typeof EXERCISE_VERDICTS;

/** RPE 1–10. [name, description] — copy from the prototype review screen. */
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

export const DEFAULT_RPE = 5;

export type DiscomfortNote = {
  area: BodyArea;
  sensation: Sensation | null;
  /** Exercise id the user linked it to, if any. */
  exerciseId: string | null;
};

export type ExerciseFeedback = {
  exerciseId: string;
  verdict: ExerciseVerdict;
};

export type SessionReview = {
  sessionId: string;
  /** ISO timestamp when the check-in was saved. */
  reviewedAt: string;
  /** Rate of perceived exertion for the whole session, 1–10. */
  rpe: number;
  /** True when the session was stopped early because of pain. */
  stoppedForPain: boolean;
  discomfort: DiscomfortNote[];
  /** Only exercises with a verdict other than "none". */
  exerciseFeedback: ExerciseFeedback[];
  note: string;
};

export type ReviewDraft = Omit<SessionReview, 'reviewedAt'>;

export const NOTE_MAX = 600;

export function effortLevel(rpe: number): { name: string; description: string } {
  const [name, description] = EFFORT_LEVELS[clampRpe(rpe) - 1];
  return { name, description };
}

export function clampRpe(rpe: number): number {
  return Math.min(10, Math.max(1, Math.round(Number.isFinite(rpe) ? rpe : DEFAULT_RPE)));
}

export function hasPain(draft: Pick<ReviewDraft, 'discomfort' | 'stoppedForPain'>): boolean {
  return draft.stoppedForPain || draft.discomfort.some((d) => d.sensation === 'pain');
}

/** Validates and cleans a draft before saving. Throws on unusable input. */
export function buildReview(draft: ReviewDraft, now: Date = new Date()): SessionReview {
  if (!draft.sessionId) throw new Error('A review needs a sessionId');
  const seen = new Set<BodyArea>();
  const discomfort = draft.discomfort.filter((d) => {
    if (!(d.area in BODY_AREAS) || seen.has(d.area)) return false;
    seen.add(d.area);
    return true;
  });
  return {
    sessionId: draft.sessionId,
    reviewedAt: now.toISOString(),
    rpe: clampRpe(draft.rpe),
    stoppedForPain: draft.stoppedForPain,
    discomfort,
    exerciseFeedback: draft.exerciseFeedback.filter((f) => f.verdict !== 'none' && f.verdict in EXERCISE_VERDICTS),
    note: draft.note.trim().slice(0, NOTE_MAX),
  };
}

/** Mascot mood after the check-in (Home reads it). Matches the prototype's mapping. */
export function moodAfterReview(draft: Pick<ReviewDraft, 'rpe' | 'discomfort' | 'stoppedForPain'>):
  'concerned' | 'exhausted' | 'tired' | 'content' | 'happy' {
  if (draft.stoppedForPain || draft.discomfort.length > 0) return 'concerned';
  if (draft.rpe >= 10) return 'exhausted';
  if (draft.rpe >= 8) return 'tired';
  if (draft.rpe >= 6) return 'content';
  return 'happy';
}

export type Adjustment = 'easier' | 'keep' | 'harder' | 'swap';

/**
 * Suggestion for next week's plan, per exercise, from recent reviews
 * (most recent first). Conservative on purpose: anything pain-related or
 * "too demanding" wins over "too easy". General guidance only — not medical.
 */
export function suggestAdjustments(reviews: SessionReview[], lookback = 3): Map<string, Adjustment> {
  const result = new Map<string, Adjustment>();
  const rank: Record<Adjustment, number> = { swap: 3, easier: 2, harder: 1, keep: 0 };
  const put = (id: string, a: Adjustment) => {
    const prev = result.get(id);
    if (!prev || rank[a] > rank[prev]) result.set(id, a);
  };
  for (const r of reviews.slice(0, lookback)) {
    for (const f of r.exerciseFeedback) {
      if (f.verdict === 'alternative') put(f.exerciseId, 'swap');
      else if (f.verdict === 'tooHard' || f.verdict === 'form') put(f.exerciseId, 'easier');
      else if (f.verdict === 'tooEasy') put(f.exerciseId, r.rpe <= 7 ? 'harder' : 'keep');
    }
    for (const d of r.discomfort) {
      if (d.exerciseId && d.sensation === 'pain') put(d.exerciseId, 'swap');
      else if (d.exerciseId) put(d.exerciseId, 'easier');
    }
  }
  return result;
}
