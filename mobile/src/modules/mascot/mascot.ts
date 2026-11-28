/** Mascot display state — OWNER: Đỗ Huy. Contract: setMascotMood(mood). */
import { MOODS, isOneOf, type Mood } from '../../shared/constants';
import { KEYS, read, write } from '../../shared/storage';
import { toDateKey } from '../../shared/dates';

/** A display timeout, not a health/recovery assessment. History and pain signals never expire here. */
export const MOOD_DISPLAY_MS = 24 * 60 * 60 * 1000;
export function setMascotMood(mood: Mood): void {
  if (!isOneOf(MOODS, mood)) {
    console.warn('setMascotMood: unknown mood', mood);
    return;
  }
  write(KEYS.mascot, { mood, at: new Date().toISOString() });
}

export function getMascotState(now: Date = new Date()): {
  mood: Mood;
  expiresAt: number | null;
} {
  const stored = read<{ mood?: unknown; at?: unknown } | null>(
    KEYS.mascot,
    null,
  );
  if (!stored || !isOneOf(MOODS, stored.mood))
    return { mood: 'happy', expiresAt: null };
  const at = typeof stored.at === 'string' ? Date.parse(stored.at) : NaN;
  const current = now.getTime();
  if (!Number.isFinite(at) || at > current || current - at >= MOOD_DISPLAY_MS)
    return { mood: 'waiting', expiresAt: null };
  return { mood: stored.mood, expiresAt: at + MOOD_DISPLAY_MS };
}
export function getMascotMood(now: Date = new Date()): Mood {
  return getMascotState(now).mood;
}

/** A past log does not describe today; a new activity must not overwrite a recent recovery expression. */
export function noteActivityMood(date: string): void {
  if (date !== toDateKey(new Date())) return;
  if (['concerned', 'tired', 'exhausted'].includes(getMascotMood())) return;
  setMascotMood('energized');
}
