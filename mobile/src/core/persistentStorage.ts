// The shared models read and write storage synchronously (like localStorage). React Native's storage is
// async, so we keep an in-memory copy, fill it once at start-up (hydrate) and write changes through.

/** The few async calls we need; AsyncStorage (v3) and test fakes both satisfy this. */
export interface KeyValueBackend {
  getAllKeys(): Promise<string[]>;
  getMany(keys: string[]): Promise<Record<string, string | null>>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const KEY_PREFIX = 'fitlens.';

export class PersistentStorage {
  private readonly map = new Map<string, string>();
  private pending: Promise<unknown> = Promise.resolve();
  /** Number of writes that failed to reach the backend (the in-memory copy still has them). */
  failedWrites = 0;

  constructor(private readonly backend: KeyValueBackend) {}

  /** Load every `fitlens.*` key. Never throws: if the backend fails the app starts empty. */
  async hydrate(): Promise<void> {
    try {
      const keys = (await this.backend.getAllKeys()).filter(k => k.startsWith(KEY_PREFIX));
      if (keys.length === 0) {
        return;
      }
      const values = await this.backend.getMany(keys);
      for (const key of keys) {
        const value = values[key];
        if (typeof value === 'string') {
          this.map.set(key, value);
        }
      }
    } catch {
      // start empty
    }
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
    this.write(() => this.backend.setItem(key, String(value)));
  }

  removeItem(key: string): void {
    this.map.delete(key);
    this.write(() => this.backend.removeItem(key));
  }

  /** Resolves when every write queued so far has finished (used by tests and before closing the app). */
  flush(): Promise<void> {
    return this.pending.then(() => undefined);
  }

  // Writes run one after another so the last value always wins.
  private write(task: () => Promise<void>): void {
    this.pending = this.pending.then(task).catch(() => {
      this.failedWrites += 1;
    });
  }
}
