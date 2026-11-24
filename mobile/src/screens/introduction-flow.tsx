import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { IntroductionStackParamList } from '../navigation';
import { getIntroductionInitialStep } from '../modules/onboarding/onboarding';
import WelcomeScreen from './welcome';
import NameEntryScreen from './name-entry';
import GreetingScreen from './greeting';
import HealthIntroScreen from './health-intro';
import NotificationsIntroScreen from './notifications-intro';

const Stack = createNativeStackNavigator<IntroductionStackParamList>();

export interface IntroductionFlowProps {
  initialRouteName?: keyof IntroductionStackParamList;
}

export default function IntroductionFlow({
  initialRouteName,
}: IntroductionFlowProps = {}) {
  const startRoute = initialRouteName ?? getIntroductionInitialStep();

  return (
    <Stack.Navigator
      initialRouteName={startRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F7F3EC' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="NameEntry" component={NameEntryScreen} />
      <Stack.Screen name="Greeting" component={GreetingScreen} />
      <Stack.Screen name="HealthIntro" component={HealthIntroScreen} />
      <Stack.Screen
        name="NotificationsIntro"
        component={NotificationsIntroScreen}
      />
    </Stack.Navigator>
  );
}
