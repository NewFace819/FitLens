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
  activeTraining: 'fitlens.active-training',
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
let writable = false;
let pending: Promise<void> = Promise.resolve();
const protectedKeys = new Set<string>();
const revisions = new Map<string, number>();
const queuedKeys = new Set<string>();
let resetGeneration = 0;

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.then(() => undefined, () => undefined);
  return result;
}

export const storageReady = () => writable;
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
  return !!value && typeof value === 'object' && Number.isSafeInteger((value as Envelope).v) && (value as Envelope).v >= 1 && 'data' in (value as object);
}

/** Load every `fitlens.*` key into memory. Call once before rendering. */
export async function hydrate(p: Persistence | null): Promise<void> {
  writable = false;
  await pending;
  persistence = p;
  cache.clear();
  protectedKeys.clear();
  revisions.clear();
  queuedKeys.clear();
  resetGeneration += 1;
  if (p) {
    try {
      for (const [key, raw] of await p.loadAll()) {
        if (!key.startsWith(PREFIX) || raw === null) continue;
        try {
          const parsed = JSON.parse(raw);
          if (isEnvelope(parsed)) cache.set(key, parsed);
          else protectedKeys.add(key);
        } catch {
          protectedKeys.add(key); // Do not silently overwrite an unreadable record.
        }
      }
    } catch {
      reportError('Could not load saved data.');
      changed();
      return;
    }
  }
  writable = true;
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
  if (!writable || protectedKeys.has(key) || (existing && existing.v > currentVersion)) {
    reportError(`${key} cannot be safely written; reload or recover saved data first.`);
    return false;
  }
  let raw: string;
  try { raw = JSON.stringify({ v: currentVersion, data }); } catch { return false; }
  const env: Envelope = JSON.parse(raw);
  revisions.set(key, (revisions.get(key) ?? 0) + 1);
  cache.set(key, env);
  changed();
  const target = persistence;
  if (target) enqueue(() => target.save(key, raw)).catch(() => reportError('Couldn’t save on this device. Please try again.'));
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
    if (!writable || protectedKeys.has(key) || (cache.get(key)?.v ?? 1) > 1) throw new Error('Saved data cannot be removed.');
    revisions.set(key, (revisions.get(key) ?? 0) + 1);
    cache.delete(key);
    changed();
    const target = persistence;
    if (target) enqueue(() => target.remove([key])).catch(() => reportError('Couldn’t clear saved data.'));
  },
};
/** Serial read-modify-write, acknowledged by the device before publishing cache.
 * Used for history/review/active-session writes; legacy write remains synchronous.
 * hydrate(null) is a memory-only fixture, not a durable device adapter.
 */
export function updateDurable<T>(key: string, update: (current: unknown) => T, currentVersion = 1): Promise<T> {
  const target = persistence;
  if (!writable || !target) return Promise.reject(new Error('Storage is not ready for durable writes.'));
  const generation = resetGeneration;
  queuedKeys.add(key);
  return enqueue(async () => {
    const existing = cache.get(key);
    if (!writable || generation !== resetGeneration || target !== persistence || protectedKeys.has(key) || (existing && existing.v > currentVersion)) {
      throw new Error('Saved data cannot be overwritten by this version.');
    }
    const rev = revisions.get(key) ?? 0;
    const value = update(existing ? JSON.parse(JSON.stringify(existing.data)) : undefined);
    const raw = JSON.stringify({ v: currentVersion, data: value });
    await target.save(key, raw);
    if (generation !== resetGeneration) throw new Error('Saved data was reset.');
    if ((revisions.get(key) ?? 0) === rev) {
      cache.set(key, JSON.parse(raw));
      changed();
    }
    return JSON.parse(raw).data as T;
  });
}

export function writeDurable<T>(key: string, value: T, currentVersion = 1): Promise<T> {
  // Capture the value now: later caller mutations must not change queued writes.
  const snapshot = JSON.parse(JSON.stringify(value)) as T;
  return updateDurable(key, () => snapshot, currentVersion);
}

export function has(key: string): boolean {
  return cache.has(key);
}

/** Remove every `fitlens.*` key (used by "Reset sample data"). */
export function clearAll(): void {
  if (!writable) return;
  const keys = [...new Set([...cache.keys(), ...protectedKeys, ...queuedKeys])].filter((k) => k.startsWith(PREFIX));
  resetGeneration += 1;
  queuedKeys.clear();
  protectedKeys.clear();
  keys.forEach((key) => revisions.set(key, (revisions.get(key) ?? 0) + 1));
  keys.forEach((k) => cache.delete(k));
  changed();
  const target = persistence;
  if (target) enqueue(() => target.remove(keys)).catch(() => reportError('Couldn’t clear saved data.'));
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
