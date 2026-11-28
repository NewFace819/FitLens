// Types for the shared workout/schedule models in ../prototype (docs/design/DATA_CONTRACT.md). The models
// are plain JS, so these describe only what the app uses.
export type Region = 'knees' | 'back' | 'wrists' | 'shoulders' | 'ankles' | 'hips';
export type Equipment = 'dumbbells' | 'bands' | 'mat' | 'bench' | 'barbell' | 'machine';
export type Goal = 'habit' | 'strength' | 'muscle' | 'endurance';
export type SessionStatus = 'planned' | 'done' | 'skipped';

export type WorkoutItem = { exerciseId: string; sets: number; reps: string; rest: number };
export type Workout = {
  id: string;
  source: 'template' | 'custom';
  title: string;
  items: WorkoutItem[];
  updatedAt: string | null;
  goals?: Goal[];
  detail?: string;
};
export type ExerciseInfo = { id: string; name: string; equipment: Equipment[]; regions: Region[]; defaults: { sets: number; reps: string; rest: number } };
export type Session = { id: string; workoutId: string; date: string; time: string | null; status: SessionStatus };

export type Profile = {
  goal: Goal;
  daysPerWeek: 2 | 3 | 4 | 5;
  minutes: number;
  equipment: Equipment[];
  avoidRegions: Region[];
};
/** What generateDraft actually used after last week's check-in (draft-model.js adjustFor). */
export type DraftAdjust = { loadAdjust: number; reason: 'pain' | 'hard' | 'easy' | null; minutes: number; daysPerWeek: number };
export type Draft = {
  weekStart: string;
  profile: Profile;
  adjust: DraftAdjust;
  sessions: { workoutId: string; date: string; time: string | null }[];
};

export type MutationResult<T> = { ok: true } & T | { ok: false; reason: string };

/** What the screens use from window.FitLensWorkout (prototype/workout-store.js) plus the draft model. */
export type AppStore = {
  listWorkouts(): Workout[];
  getWorkout(id: string): Workout | null;
  createWorkout(data: { title?: string; items?: Partial<WorkoutItem>[] }): Workout | null;
  updateWorkout(id: string, patch: { title?: string; items?: Partial<WorkoutItem>[] }): Workout | null;
  listExercises(): ExerciseInfo[];
  updateSession(id: string, patch: { date?: string; time?: string | null }): { ok: true; session: Session } | { ok: false; reason: string };
  deleteWorkout(id: string): { ok: boolean; reason?: string; count?: number };
  getWeekSchedule(weekStart: string): Session[];
  getNextSession(now?: Date): Session | null;
  addSession(data: { workoutId: string; date: string; time?: string | null }): { ok: true; session: Session } | { ok: false; reason: string };
  removeSession(id: string): boolean;
  markSessionDone(id: string): Session | null;
  copyWeek(from: string, to: string): { ok: true; created: Session[]; skipped: number } | { ok: false; reason: string };
  estimateMinutes(w: Pick<Workout, 'items'>): number;
  weekStartOf(date: string): string | null;
  weekDates(weekStart: string): string[];
  addDays(date: string, n: number): string | null;
  exerciseName(id: string): string;
  todayStr(now?: Date): string;
  /** loadAdjust: Tu's getLoadAdjustForWeek(weekStart), -0.3 … +0.1 (0 = no change). */
  generateDraft(profile: Partial<Profile>, weekStart: string, loadAdjust?: number): Draft | null;
  applyDraft(draft: Draft): { ok: boolean; added?: number; skipped?: number; reason?: string };
};

export const REGIONS: Region[] = ['knees', 'back', 'wrists', 'shoulders', 'ankles', 'hips'];
export const GOALS: Goal[] = ['habit', 'strength', 'muscle', 'endurance'];
export const HOME_EQUIPMENT: Equipment[] = ['dumbbells', 'bands', 'mat', 'bench'];
