import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { configureNotifications } from '../data/reminder-store';
import { colors } from '../ui/theme';

export default function RootLayout() {
  useEffect(() => {
    configureNotifications();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}
