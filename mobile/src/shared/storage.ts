/**
 * Shared storage — DATA_CONTRACT.md §4.
 *
 * - Keys are `fitlens.<entity>`, each value is an envelope `{ v, data }`.
 * - `read`/`write` are SYNCHRONOUS like the contract says: the app hydrates an
 *   in-memory cache once at start-up (`hydrate`), reads come from the cache and
 *   writes go to the cache immediately and are persisted in the background.
 * - `read` never throws: missing/corrupt data → fallback. A newer `v` than we
 *   understand is read best-effort and never overwritten.
 * - Only the owner writes its key; others call the owner's functions.
 *
 * No React Native imports here so domain modules stay testable with `node --test`.
 */

export const KEYS = {
  profile: 'fitlens.profile',
  workouts: 'fitlens.workouts',
  sessions: 'fitlens.sessions',
  history: 'fitlens.history',
  reviews: 'fitlens.reviews',
  rhythm: 'fitlens.rhythm',
  reminders: 'fitlens.reminders',
  activities: 'fitlens.activities',
  mascot: 'fitlens.mascot',
  seed: 'fitlens.seed',
  welcome: 'fitlens.welcome',
  onboarding: 'fitlens.onboarding',
} as const;

export const PREFIX = 'fitlens.';

export type Envelope = { v: number; data: unknown };

/** Where the cache is persisted (AsyncStorage in the app, nothing in tests). */
export type Persistence = {
  loadAll(): Promise<[string, string | null][]>;
  save(key: string, value: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
};

const cache = new Map<string, Envelope>();
let persistence: Persistence | null = null;
let version = 0;
const listeners = new Set<() => void>();
const errorListeners = new Set<(message: string) => void>();

function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

function reportError(message: string) {
  console.warn('[storage]', message);
  errorListeners.forEach((l) => l(message));
}

function isEnvelope(value: unknown): value is Envelope {
  return !!value && typeof value === 'object' && typeof (value as Envelope).v === 'number' && 'data' in (value as object);
}

/** Load every `fitlens.*` key into memory. Call once before rendering. */
export async function hydrate(p: Persistence | null): Promise<void> {
  persistence = p;
  cache.clear();
  if (p) {
    try {
      for (const [key, raw] of await p.loadAll()) {
        if (!key.startsWith(PREFIX) || raw === null) continue;
        try {
          const parsed = JSON.parse(raw);
          if (isEnvelope(parsed)) cache.set(key, parsed);
        } catch {
          // Corrupt value: ignore, readers get their fallback.
        }
      }
    } catch {
      reportError('Could not load saved data.');
    }
  }
  changed();
}

type ReadOptions<T> = {
  /** Current version the owner writes. Default 1. */
  version?: number;
  /** Validate/clean `data`; return the fallback for anything unusable. */
  parse?: (data: unknown) => T;
  /** Upgrade an older envelope (owner only). Without it older data → fallback. */
  migrate?: (old: Envelope) => Envelope;
};

export function read<T>(key: string, fallback: T, options: ReadOptions<T> = {}): T {
  const current = options.version ?? 1;
  let env = cache.get(key);
  if (!env) return fallback;
  try {
    if (env.v < current) {
      if (!options.migrate) return fallback;
      env = options.migrate(env);
    }
    return options.parse ? options.parse(env.data) : (env.data as T);
  } catch {
    return fallback;
  }
}

/** Write the owner's data. Returns false if the stored data is newer than this code (not overwritten). */
export function write(key: string, data: unknown, currentVersion = 1): boolean {
  const existing = cache.get(key);
  if (existing && existing.v > currentVersion) {
    reportError(`${key} was saved by a newer version; not overwriting.`);
    return false;
  }
  const env: Envelope = { v: currentVersion, data };
  cache.set(key, env);
  changed();
  persistence?.save(key, JSON.stringify(env)).catch(() => reportError('Couldn’t save on this device. Please try again.'));
  return true;
}

/**
 * Write with confirmed persistence.
 * Awaits persistence.save before updating the in-memory cache and notifying listeners.
 * If persistence fails, reports an error, leaves cache untouched, and returns false.
 */
export async function writeConfirmed(key: string, data: unknown, currentVersion = 1): Promise<boolean> {
  const existing = cache.get(key);
  if (existing && existing.v > currentVersion) {
    reportError(`${key} was saved by a newer version; not overwriting.`);
    return false;
  }
  const env: Envelope = { v: currentVersion, data };
  if (persistence) {
    try {
      await persistence.save(key, JSON.stringify(env));
    } catch {
      reportError('Couldn’t save on this device. Please try again.');
      return false;
    }
  }
  cache.set(key, env);
  changed();
  return true;
}

/**
 * localStorage-shaped view of the same cache, for the shared pure-JS models in ../prototype
 * (workouts, schedule; see modules/workouts/store.ts). Values are the raw `{v, data}` JSON, so the
 * models' own envelope handling works unchanged and there is still only one cache.
 */
export const localStorageView = {
  getItem(key: string): string | null {
    const env = cache.get(key);
    return env ? JSON.stringify(env) : null;
  },
  /** Throws on a value that is not an envelope; the models catch it and report a storage failure. */
  setItem(key: string, value: string): void {
    const env: unknown = JSON.parse(value);
    if (!isEnvelope(env)) throw new Error(`${key}: not a {v, data} envelope`);
    if (!write(key, env.data, env.v)) throw new Error(`${key}: not saved`);
  },
  removeItem(key: string): void {
    if (!cache.delete(key)) return;
    changed();
    persistence?.remove([key]).catch(() => reportError('Couldn’t clear saved data.'));
  },
};

export function has(key: string): boolean {
  return cache.has(key);
}

/** Remove every `fitlens.*` key (used by "Reset sample data"). */
export function clearAll(): void {
  const keys = [...cache.keys()].filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => cache.delete(k));
  changed();
  persistence?.remove(keys).catch(() => reportError('Couldn’t clear saved data.'));
}

/** For React: re-render when anything changes (see ui/use-store.ts). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const getVersion = () => version;

export function onStorageError(listener: (message: string) => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}
