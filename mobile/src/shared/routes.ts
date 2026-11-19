/**
 * Shared route names and params — DATA_CONTRACT §12.
 * Param names are fixed: session, workout, history, week, date.
 * Home/dock routes are owned by Đỗ Huy; this lists only what exists so far.
 */
export const ROUTES = {
  home: 'Home',
  rhythm: 'Rhythm',
  reminders: 'Reminders',
  checkIn: 'CheckIn',
  workouts: 'Workouts',
  plan: 'Plan',
  training: 'Training',
} as const;

/** React Navigation param list. Missing/invalid params → the screen goes back to its parent. */
export type RootStackParamList = {
  Home: undefined;
  Rhythm: undefined;
  Reminders: undefined;
  CheckIn: { history: string };
  Workouts: undefined;
  Plan: undefined;
  Training: { workout?: string; session?: string } | undefined;
};
