import AsyncStorage from '@react-native-async-storage/async-storage';

/** Storage keys follow `fitlens:<name>:v<n>` like the prototype. */
export const KEYS = {
  rhythm: 'fitlens:rhythm:v1',
  reminders: 'fitlens:reminders:v2',
  reminderIds: 'fitlens:reminder-notification-ids:v1',
  history: 'fitlens:training-history:v1',
  reviews: 'fitlens:reviews:v1',
  lastCheckIn: 'fitlens:last-check-in:v1',
} as const;

export async function readJson<T>(key: string, normalize: (raw: unknown) => T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return normalize(raw === null ? null : JSON.parse(raw));
  } catch {
    return normalize(null);
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
