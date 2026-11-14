import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { configureNotifications, syncReminderNotifications } from '../modules/reminders/notifications';
import { ensureSeeded } from '../shared/seed.ts';
import { hydrate } from '../shared/storage.ts';
import { nativePersistence } from '../shared/storage-native.ts';
import { colors } from '../ui/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    configureNotifications();
    hydrate(nativePersistence)
      .then(() => {
        ensureSeeded(); // contract §8: sample data until the real modules exist
        setReady(true);
        return syncReminderNotifications(); // never prompts here
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}
