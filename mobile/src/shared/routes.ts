/**
 * Shared route names and params — DATA_CONTRACT §12.
 * Param names are fixed: session, workout, history, week, date.
 * Every MVP route is registered here and in App.tsx up front (placeholder screens), so owners only
 * replace their own screen file and nobody needs to edit this file or App.tsx again.
 */
export const ROUTES = {
  welcome: 'Welcome',
  home: 'Home',
  rhythm: 'Rhythm',
  reminders: 'Reminders',
  checkIn: 'CheckIn',
  workouts: 'Workouts',
  plan: 'Plan',
  workoutDetail: 'WorkoutDetail',
  onboarding: 'Onboarding',
  profile: 'Profile',
  insights: 'Insights',
  workout: 'Workout',
  recap: 'Recap',
  history: 'History',
  camera: 'Camera',
} as const;

/** React Navigation param list. Missing/invalid params → the screen goes back to its parent. */
export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  Rhythm: undefined;
  Reminders: undefined;
  CheckIn: { history: string; fromWorkout?: boolean };
  Workouts: undefined;
  Plan: undefined;
  // Hải — one workout (contract §12 param `workout`), e.g. opened from Home.
  WorkoutDetail: { workout: string };
  // Thông
  Onboarding: undefined;
  Profile: undefined;
  Insights: undefined;
  // Đức Huy — the session being trained. `session` (from Plan) or `workout` (free workout).
  // `cameraReps` is set by the Camera screen when it returns (see Camera below).
  Workout: { session?: string; workout?: string; cameraReps?: number } | undefined;
  Recap: { history: string };
  History: undefined;
  // Đỗ Huy — rep counter for one exercise. When done it returns the count with
  // nav.navigate({ name: 'Workout', params: { cameraReps }, merge: true }).
  Camera: { exerciseId: string; targetReps?: number };
};
