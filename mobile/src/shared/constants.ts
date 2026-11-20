/**
 * Shared enums — DATA_CONTRACT.md §1. Defined once; never type these strings by hand.
 * Values are lower-case English, camelCase for multiple words.
 */

export const REGIONS = ['knees', 'back', 'wrists', 'shoulders', 'ankles', 'hips'] as const;
export type Region = (typeof REGIONS)[number];
export const REGION_LABELS: Record<Region, string> = {
  knees: 'Knees',
  back: 'Back',
  wrists: 'Wrists',
  shoulders: 'Shoulders',
  ankles: 'Ankles',
  hips: 'Hips',
};

export const EQUIPMENT = ['dumbbells', 'bands', 'mat', 'bench', 'barbell', 'machine'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const GOALS = ['habit', 'strength', 'muscle', 'endurance'] as const;
export type Goal = (typeof GOALS)[number];

export const EXPERIENCES = ['new', 'returning', 'regular'] as const;
export type Experience = (typeof EXPERIENCES)[number];

export const PLACES = ['home', 'gym'] as const;
export type Place = (typeof PLACES)[number];

export const SESSION_STATUSES = ['planned', 'done', 'skipped'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ACTIVITY_TYPES = ['walk', 'run', 'cycle', 'swim', 'other'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MUSCLES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core'] as const;
export type Muscle = (typeof MUSCLES)[number];

/** Per-exercise check-in feedback. Tu's 1–10 score maps onto these (see checkin/review-model.ts). */
export const EXERCISE_FEEDBACK = ['tooEasy', 'justRight', 'tooHard', 'painful'] as const;
export type ExerciseFeedback = (typeof EXERCISE_FEEDBACK)[number];

/** Borg CR10, asked once after a session. Not an injury signal. */
export type Rpe = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Mascot expressions (Đỗ Huy to confirm the final list). Matches ui/mascot-svgs. */
export const MOODS = ['happy', 'content', 'waiting', 'calm', 'energized', 'tired', 'exhausted', 'concerned'] as const;
export type Mood = (typeof MOODS)[number];

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}
