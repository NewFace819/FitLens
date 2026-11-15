import type { KeyValueBackend } from '../src/core/persistentStorage';

/** In-memory stand-in for AsyncStorage. Keep `data` to look at (or seed) what was saved. */
export class FakeBackend implements KeyValueBackend {
  data = new Map<string, string>();
  failWrites = false;
  failReads = false;

  async getAllKeys(): Promise<string[]> {
    if (this.failReads) {
      throw new Error('read failed');
    }
    return [...this.data.keys()];
  }
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    if (this.failReads) {
      throw new Error('read failed');
    }
    return Object.fromEntries(keys.map(k => [k, this.data.has(k) ? (this.data.get(k) as string) : null]));
  }
  async setItem(key: string, value: string): Promise<void> {
    if (this.failWrites) {
      throw new Error('write failed');
    }
    this.data.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    if (this.failWrites) {
      throw new Error('write failed');
    }
    this.data.delete(key);
  }
}
