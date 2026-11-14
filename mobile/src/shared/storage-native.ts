import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREFIX, type Persistence } from './storage.ts';

/** AsyncStorage-backed persistence for the shared storage cache. */
export const nativePersistence: Persistence = {
  async loadAll() {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    return (await AsyncStorage.multiGet(keys)) as [string, string | null][];
  },
  save: (key, value) => AsyncStorage.setItem(key, value),
  remove: (keys) => AsyncStorage.multiRemove(keys),
};
