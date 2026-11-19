/**
 * Welcome introduction state & acknowledgment — DATA_CONTRACT §4.
 *
 * Persists a narrowly named Welcome acknowledgment (`fitlens.welcome`)
 * when Get Started is pressed. The acknowledgment indicates the introduction
 * was seen on this device (not that onboarding is complete).
 */
import { KEYS, read, write } from '../../shared/storage';

export type WelcomeAcknowledgment = {
  seenAt: string;
};

export function hasSeenWelcome(): boolean {
  return read<boolean>(KEYS.welcome, false, {
    parse: (data) => {
      if (typeof data === 'boolean') return data;
      if (data && typeof data === 'object' && 'seenAt' in data) {
        return typeof (data as WelcomeAcknowledgment).seenAt === 'string';
      }
      return false;
    },
  });
}

export function markWelcomeSeen(now: Date = new Date()): void {
  write(KEYS.welcome, { seenAt: now.toISOString() });
}
