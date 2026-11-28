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
import { getStartupRoute } from './src/modules/onboarding/onboarding';
import { syncReminderNotifications } from './src/modules/reminders/notifications';
import { startDeviceReminders } from './src/modules/reminders/device';
import { notifyKitScheduler } from './src/modules/reminders/notifykit-scheduler';
import CameraScreen from './src/screens/camera';
import HistoryScreen from './src/screens/history';
import InsightsScreen from './src/screens/insights';
import IntroductionFlow from './src/screens/introduction-flow';
import OnboardingScreen from './src/screens/onboarding';
import ProfileScreen from './src/screens/profile';
import RecapScreen from './src/screens/recap';
import WorkoutScreen from './src/screens/workout';
import CheckInScreen from './src/screens/check-in';
import DevHub from './src/screens/dev-hub';
import RemindersScreen from './src/screens/reminders';
import RhythmScreen from './src/screens/rhythm';
import { PlanRoute, WorkoutDetailRoute, WorkoutsRoute } from './src/screens/workouts-routes';
import type { RootStackParamList } from './src/shared/routes';
import { ensureSeeded } from './src/shared/seed';
import { hydrate } from './src/shared/storage';
import { nativePersistence } from './src/shared/storage-native';
import { colors } from './src/ui/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
startDeviceReminders(notifyKitScheduler); // real Android reminders, kept in step with the schedule (Tu)
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } };

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Home');

  useEffect(() => {
    hydrate(nativePersistence)
      .then(() => {
        ensureSeeded();
        const startup = getStartupRoute();
        setInitialRoute(startup.rootRoute);
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
            <Stack.Screen name="Welcome" component={IntroductionFlow} />
            <Stack.Screen name="Home" component={DevHub} />
            <Stack.Screen name="Rhythm" component={RhythmScreen} />
            <Stack.Screen name="Reminders" component={RemindersScreen} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} />
            <Stack.Screen name="Workouts" component={WorkoutsRoute} />
            <Stack.Screen name="Plan" component={PlanRoute} />
            <Stack.Screen name="WorkoutDetail" component={WorkoutDetailRoute} />
            {/* Registered up front; placeholders until each owner replaces the screen file. */}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Insights" component={InsightsScreen} />
            <Stack.Screen name="Workout" component={WorkoutScreen} />
            <Stack.Screen name="Recap" component={RecapScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
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
