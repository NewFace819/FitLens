/**
 * Training history — OWNER: Đức Huy.
 *
 * ⚠️ PLACEHOLDER written by Tu so Rhythm and Check-in can run before the real
 * module lands. Đức Huy: replace the implementation, keep (or tell Tu about
 * changes to) these exported names and types:
 *   getHistory(), getLastSets(), appendReview(), getReviews()
 */
import type { SessionReview } from '../domain/checkin.ts';
import { KEYS, readJson, writeJson } from './storage';

export type LoggedSet = { kg: number | null; reps: number };

export type TrainingSession = {
  id: string;
  name: string;
  routine: string | null;
  /** ISO timestamp the session was finished. */
  completedAt: string;
  durationMinutes: number;
  /** True when the user stopped the session because of pain. */
  stoppedForPain?: boolean;
  exercises: { id: string; name: string; sets: LoggedSet[] }[];
};

const asArray = <T,>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);

/** All finished sessions, oldest first. */
export async function getHistory(): Promise<TrainingSession[]> {
  const list = await readJson(KEYS.history, asArray<TrainingSession>);
  return list.filter((s) => s && typeof s.id === 'string' && typeof s.completedAt === 'string')
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export async function getSession(id: string): Promise<TrainingSession | null> {
  return (await getHistory()).find((s) => s.id === id) ?? null;
}

/** Last logged sets for an exercise ("use last time"). */
export async function getLastSets(exerciseId: string): Promise<LoggedSet[] | null> {
  const history = await getHistory();
  for (let i = history.length - 1; i >= 0; i--) {
    const ex = history[i].exercises.find((e) => e.id === exerciseId);
    if (ex) return ex.sets;
  }
  return null;
}

export async function appendSession(session: TrainingSession): Promise<void> {
  const list = (await getHistory()).filter((s) => s.id !== session.id);
  await writeJson(KEYS.history, [...list, session]);
}

/** Replace the whole history (used to load the sample data). */
export async function replaceHistory(sessions: TrainingSession[]): Promise<void> {
  await writeJson(KEYS.history, sessions);
}

/** Reviews, most recent first. */
export async function getReviews(): Promise<SessionReview[]> {
  const list = await readJson(KEYS.reviews, asArray<SessionReview>);
  return list.filter((r) => r && typeof r.sessionId === 'string')
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
}

/** Saves a post-workout check-in. One review per session: re-saving replaces it. */
export async function appendReview(review: SessionReview): Promise<void> {
  const list = (await getReviews()).filter((r) => r.sessionId !== review.sessionId);
  await writeJson(KEYS.reviews, [review, ...list]);
}
