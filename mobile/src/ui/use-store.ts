import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '../shared/storage.ts';

/**
 * Re-render when shared storage changes. Screens then just call the sync
 * contract functions (getRhythm(), getReminder(), …) during render.
 */
export function useStore(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
