/**
 * FitLens app root (React Native CLI).
 * Hydrates shared storage, loads sample data (contract §8), then shows the stack.
 * Home + dock belong to Đỗ Huy; 'Home' is a temporary dev hub for now.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { syncReminderNotifications } from './src/modules/reminders/notifications';
import { hasSeenWelcome } from './src/modules/welcome/welcome';
import CheckInScreen from './src/screens/check-in';
import DevHub from './src/screens/dev-hub';
import RemindersScreen from './src/screens/reminders';
import RhythmScreen from './src/screens/rhythm';
import WelcomeScreen from './src/screens/welcome';
import type { RootStackParamList } from './src/shared/routes';
import { ensureSeeded } from './src/shared/seed';
import { hydrate } from './src/shared/storage';
import { nativePersistence } from './src/shared/storage-native';
import { colors } from './src/ui/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } };

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Home');

  useEffect(() => {
    hydrate(nativePersistence)
      .then(() => {
        ensureSeeded();
        const seen = hasSeenWelcome();
        setInitialRoute(seen ? 'Home' : 'Welcome');
        setReady(true);
        return syncReminderNotifications(); // never prompts here
      })
      .catch(() => setReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {ready ? (
        <NavigationContainer theme={theme}>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Home" component={DevHub} />
            <Stack.Screen name="Rhythm" component={RhythmScreen} />
            <Stack.Screen name="Reminders" component={RemindersScreen} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
