/**
 * @format
 */

import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';
import { clearAll, hydrate } from '../src/shared/storage';
import { nativePersistence } from '../src/shared/storage-native';
import {
  getOnboardingStep,
  isOnboardingCompleted,
  saveOnboardingStep,
} from '../src/modules/onboarding/onboarding';
import { saveProfileName } from '../src/modules/profile/profile';
import { markWelcomeSeen } from '../src/modules/welcome/welcome';

jest.mock('react-native-safe-area-context', () => {
  return require('react-native-safe-area-context/jest/mock').default;
});

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
  await AsyncStorage.clear();
  await hydrate(nativePersistence);
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

test('Fresh launch: mounts Welcome, pressing Get Started visibly renders NameEntry', async () => {
  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<App />);
  });

  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');

  const getStartedBtn = findPressableByLabel(activeRenderer!.root, 'Get Started');
  await ReactTestRenderer.act(async () => {
    await getStartedBtn.props.onPress();
  });

  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
  expect(getOnboardingStep()).toBe('name');
});

test('Restart with saved unfinished step: restores that screen (HealthIntro)', async () => {
  // Pre-seed saved progress up to 'health'
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  await saveOnboardingStep('health');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<App />);
  });

  expect(findTexts(activeRenderer!)).toContain('See your movement\ncome to life.');
  expect(getOnboardingStep()).toBe('health');
});

test('Startup precedence: saved name with explicit earlier step (name) restores NameEntry', async () => {
  // Profile has confirmed name, but explicit step is 'name'
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  await saveOnboardingStep('name');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<App />);
  });

  // Explicit step 'name' takes precedence over confirmed profile name
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');
  expect(findTexts(activeRenderer!)).not.toContain('Nice to meet you,\nĐỗ Huy!');
  expect(getOnboardingStep()).toBe('name');
});

test('Startup precedence: saved name with explicit earlier step (welcome) restores Welcome', async () => {
  markWelcomeSeen();
  await saveProfileName('Đỗ Huy');
  await saveOnboardingStep('welcome');

  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<App />);
  });

  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');
  expect(findTexts(activeRenderer!)).not.toContain('Nice to meet you,\nĐỗ Huy!');
  expect(getOnboardingStep()).toBe('welcome');
});

test('Complete via skip path: resets root stack to Home, and subsequent restart mounts Home directly', async () => {
  // 1. Fresh launch
  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<App />);
  });

  const root = activeRenderer!.root;
  expect(findTexts(activeRenderer!)).toContain('Welcome to\nFitLens.');

  // Welcome -> NameEntry
  const getStartedBtn = findPressableByLabel(root, 'Get Started');
  await ReactTestRenderer.act(async () => {
    await getStartedBtn.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('What should\nI call you?');

  // NameEntry -> Greeting
  const nameInput = root.findByType(TextInput);
  await ReactTestRenderer.act(async () => {
    nameInput.props.onChangeText('Đỗ Huy');
  });
  const confirmBtn = findPressableByLabel(root, 'Confirm name');
  await ReactTestRenderer.act(async () => {
    await confirmBtn.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('Nice to meet you,\nĐỗ Huy!');

  // Greeting -> HealthIntro
  const continueBtn = findPressableByLabel(root, 'Continue');
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('See your movement\ncome to life.');

  // HealthIntro -> NotificationsIntro via skip
  const skipHealth = root.findAll((node) => {
    return (
      (node.props.accessibilityLabel === 'Maybe later' || node.props.accessibilityLabel === 'Not now') &&
      typeof node.props.onPress === 'function'
    );
  })[0];
  await ReactTestRenderer.act(async () => {
    await skipHealth.props.onPress();
  });
  expect(findTexts(activeRenderer!)).toContain('A little nudge,\nwhen it matters.');

  // NotificationsIntro -> Home via skip
  const skipNotif = findPressableByLabel(root, 'Maybe later');
  await ReactTestRenderer.act(async () => {
    await skipNotif.props.onPress();
  });

  // Root stack reset to the current Home screen
  expect(isOnboardingCompleted()).toBe(true);
  expect(findPressableByLabel(activeRenderer!.root, 'Open Account')).toBeDefined();
  expect(findTexts(activeRenderer!)).not.toContain('Welcome to\nFitLens.');

  // 2. Unmount and simulate restart
  await ReactTestRenderer.act(async () => {
    activeRenderer?.unmount();
  });
  activeRenderer = null;

  // Mount afresh as a new app launch
  await ReactTestRenderer.act(async () => {
    activeRenderer = ReactTestRenderer.create(<App />);
  });

  // Confirmed completed step routes directly to Home on startup
  expect(findPressableByLabel(activeRenderer!.root, 'Open Account')).toBeDefined();
  expect(findTexts(activeRenderer!)).not.toContain('Welcome to\nFitLens.');
});
