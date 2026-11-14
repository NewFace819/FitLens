/**
 * Mascot mood — OWNER: Đỗ Huy.
 * ⚠️ PLACEHOLDER by Tu: contract function setMascotMood(mood) (DATA_CONTRACT §6).
 */
import { MOODS, isOneOf, type Mood } from '../../shared/constants.ts';
import { KEYS, read, write } from '../../shared/storage.ts';

export function setMascotMood(mood: Mood): void {
  if (!isOneOf(MOODS, mood)) {
    console.warn('setMascotMood: unknown mood', mood);
    return;
  }
  write(KEYS.mascot, { mood, at: new Date().toISOString() });
}

export function getMascotMood(): Mood {
  return read(KEYS.mascot, 'happy' as Mood, { parse: (d) => (isOneOf(MOODS, (d as { mood?: unknown })?.mood) ? (d as { mood: Mood }).mood : 'happy') });
}
