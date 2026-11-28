import React from 'react';
import { Text, TextInput, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IntroductionFlow from './introduction-flow';
import { clearAll, hydrate, type Persistence } from '../shared/storage';
import {
  getOnboardingStep,
  isOnboardingCompleted,
  saveOnboardingStep,
} from '../modules/onboarding/onboarding';
import { getProfile, saveProfileName } from '../modules/profile/profile';
import { hasSeenWelcome, markWelcomeSeen } from '../modules/welcome/welcome';
import type { RootStackParamList } from '../shared/routes';

jest.mock('react-native-safe-area-context', () => {
  return require('react-native-safe-area-context/jest/mock').default;
});

function DummyHomeScreen() {
  return (
    <View>
      <Text>Home Screen Content</Text>
    </View>
  );
}

const RootStack = createNativeStackNavigator<RootStackParamList>();

function TestAppRoot({ initialRoute = 'Welcome' }: { initialRoute?: keyof RootStackParamList }) {
  return (
    <NavigationContainer>
      <RootStack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Welcome" component={IntroductionFlow} />
        <RootStack.Screen name="Home" component={DummyHomeScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function findTexts(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map((t) => t.props.children);
}

function findPressableByLabel(root: ReactTestRenderer.ReactTestInstance, label: string) {
  const matches = root.findAll((node) => {
    return (
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function'
    );
  });
  if (matches.length === 0) {
    throw new Error(`No pressable found with accessibilityLabel "${label}"`);
  }
  return matches[matches.length - 1];
}

let activeRenderer: ReactTestRenderer.ReactTestRenderer | null = null;
let warnSpy: jest.SpyInstance;

beforeAll(() => {
  const originalWarn = console.warn;
  warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Found screens with the same name')) {
      return;
    }
    originalWarn(...args);
  });
});

afterAll(() => {
  warnSpy.mockRestore();
});

beforeEach(async () => {
  await hydrate(null);
  clearAll();
});

afterEach(async () => {
  if (activeRenderer) {
    await ReactTestRenderer.act(async () => {
      activeRenderer?.unmount();
    });
    activeRenderer = null;
  }
});

test('Real container: Pressing Get Started on Welcome navigates to NameEntry and visibly renders NameEntry', async () => {
  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  const root = activeRenderer!.root;
  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');

  const getStartedBtn = root.findByProps({ accessibilityLabel: 'Get Started' });
  await ReactTestRenderer.act(async () => {
    await getStartedBtn.props.onPress();
  });

  expect(hasSeenWelcome()).toBe(true);
  expect(getOnboardingStep()).toBe('name');

  // NameEntry screen visibly renders
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
});

test('Real container: Full progression Welcome -> NameEntry -> Greeting -> HealthIntro -> NotificationsIntro -> Home', async () => {
  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  const root = activeRenderer!.root;

  // 1. Welcome -> NameEntry
  const getStartedBtn = root.findByProps({ accessibilityLabel: 'Get Started' });
  await ReactTestRenderer.act(async () => {
    await getStartedBtn.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');

  // 2. NameEntry -> Greeting
  const input = root.findByType(TextInput);
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText('Đỗ Huy');
  });

  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });
  await ReactTestRenderer.act(async () => {
    await confirmBtn.props.onPress();
  });

  expect(getProfile().name).toBe('Đỗ Huy');
  expect(getOnboardingStep()).toBe('greeting');
  expect(findTexts(activeRenderer!)).toContain('Nice to meet you,\nĐỗ Huy!');

  // 3. Greeting -> HealthIntro
  const continueGreetingBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  await ReactTestRenderer.act(async () => {
    await continueGreetingBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('health');
  expect(findTexts(activeRenderer!)).toContain('See your movement\ncome to life.');

  // 4. HealthIntro -> NotificationsIntro (via skip path Maybe later / Not now)
  const skipHealthBtns = root.findAllByProps({ accessibilityLabel: 'Maybe later' });
  const skipHealthBtn = skipHealthBtns.length > 0
    ? skipHealthBtns[0]
    : root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await skipHealthBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('notifications');
  expect(findTexts(activeRenderer!)).toContain('A little nudge,\nwhen it matters.');

  // 5. NotificationsIntro -> Home (via skip path Maybe later)
  const maybeLaterNotifBtn = root.findByProps({ accessibilityLabel: 'Maybe later' });
  await ReactTestRenderer.act(async () => {
    await maybeLaterNotifBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('completed');
  expect(isOnboardingCompleted()).toBe(true);

  // Root stack has reset to Home
  expect(findTexts(activeRenderer!)).toContain('Home Screen Content');
});

test('Real container: Resume restores HealthIntro when step is health', async () => {
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  await saveOnboardingStep('health');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  expect(findTexts(activeRenderer!)).toContain('See your movement\ncome to life.');
});

test('Real container: Resume restores Greeting when step is greeting', async () => {
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  await saveOnboardingStep('greeting');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  expect(findTexts(activeRenderer!)).toContain('Nice to meet you,\nĐỗ Huy!');
});

test('Real container: Resume restores NameEntry when step is name', async () => {
  markWelcomeSeen();
  await saveOnboardingStep('name');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
});

test('Real container: Explicit step welcome takes precedence over saved name in profile', async () => {
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  // Explicitly saved 'welcome' (e.g. Back from NameEntry saved welcome)
  await saveOnboardingStep('welcome');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  // Explicit 'welcome' takes precedence over profile name -> opens Welcome
  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');
  expect(findTexts(activeRenderer!)).not.toContain('Nice to meet you,\nĐỗ Huy!');
});

test('Real container: Explicit step name takes precedence over saved name in profile', async () => {
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  // Explicitly saved 'name' (e.g. Back from Greeting saved name)
  await saveOnboardingStep('name');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  // Explicit 'name' takes precedence over profile name -> opens NameEntry
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
  expect(findTexts(activeRenderer!)).not.toContain('Nice to meet you,\nĐỗ Huy!');
});

test('Real container: Legacy records without explicit step fall back to Greeting if name confirmed', async () => {
  // Legacy record: no fitlens.onboarding step, but profile has name
  await saveProfileName('Đỗ Huy');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  expect(findTexts(activeRenderer!)).toContain('Nice to meet you,\nĐỗ Huy!');
});

test('Real container: Legacy records without explicit step fall back to NameEntry if welcome seen without name', async () => {
  // Legacy record: welcome seen, no name, no onboarding step
  markWelcomeSeen();

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
});

test('Real container: Back unwinds steps locally from Greeting -> NameEntry -> Welcome', async () => {
  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  const root = activeRenderer!.root;

  // 1. Get Started -> NameEntry
  await ReactTestRenderer.act(async () => {
    await root.findByProps({ accessibilityLabel: 'Get Started' }).props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');

  // 2. NameEntry -> Greeting
  const input = root.findByType(TextInput);
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText('Đỗ Huy');
  });
  await ReactTestRenderer.act(async () => {
    await root.findByProps({ accessibilityLabel: 'Confirm name' }).props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('Nice to meet you,\nĐỗ Huy!');

  // 3. Back from Greeting -> NameEntry
  const backFromGreeting = findPressableByLabel(root, 'Back');
  await ReactTestRenderer.act(async () => {
    await backFromGreeting.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
  expect(getOnboardingStep()).toBe('name');

  // 4. Back from NameEntry -> Welcome
  const backFromName = findPressableByLabel(root, 'Back');
  await ReactTestRenderer.act(async () => {
    await backFromName.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');
  expect(getOnboardingStep()).toBe('welcome');
});

test('Real container: Back on resumed local root (HealthIntro) resets local stack to Greeting', async () => {
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  await saveOnboardingStep('health');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  expect(findTexts(activeRenderer!)).toContain('See your movement\ncome to life.');

  // Pressing Back on resumed HealthIntro (canGoBack is false) resets local stack to Greeting
  const backBtn = findPressableByLabel(activeRenderer!.root, 'Back');
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(findTexts(activeRenderer!)).toContain('Nice to meet you,\nĐỗ Huy!');
  expect(getOnboardingStep()).toBe('greeting');
});

test('Real container: Failed progress write stays on current screen without advancing', async () => {
  let failSave = true;
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failSave) throw new Error('Write failed');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<TestAppRoot />);
  });

  const getStartedBtn = activeRenderer!.root.findByProps({ accessibilityLabel: 'Get Started' });
  await ReactTestRenderer.act(async () => {
    await getStartedBtn.props.onPress();
  });

  // Stays on Welcome
  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');
  expect(findTexts(activeRenderer!)).not.toContain('What should\nI call you?');

  const errorAlert = activeRenderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');
});
