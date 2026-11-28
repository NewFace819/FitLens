import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import WelcomeScreen from './welcome';
import DevHub from './dev-hub';
import { clearAll, hydrate, type Persistence } from '../shared/storage';
import { hasSeenWelcome } from '../modules/welcome/welcome';
import { getOnboardingStep } from '../modules/onboarding/onboarding';

const mockReset = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../navigation', () => ({
  useAppNavigation: () => ({
    reset: mockReset,
    navigate: mockNavigate,
    canGoBack: jest.fn(() => false),
  }),
}));

beforeEach(async () => {
  await hydrate(null);
  clearAll();
  mockReset.mockClear();
  mockNavigate.mockClear();
});

test('WelcomeScreen renders exact approved copy', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  const root = renderer!.root;
  const texts = root.findAllByType(Text).map((t) => t.props.children);

  expect(texts).toContain('FITLENS');
  expect(texts).toContain('Welcome to\nFitLens.');
  expect(texts).toContain('Your pace. Your way.');
  expect(texts).toContain('Get Started');
});

test('Pressing Get Started persists welcome acknowledgment and step name and navigates to NameEntry', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  expect(hasSeenWelcome()).toBe(false);

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Get Started' });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(hasSeenWelcome()).toBe(true);
  expect(getOnboardingStep()).toBe('name');
  expect(mockNavigate).toHaveBeenCalledWith('NameEntry');
});

test('Failed persistence on Get Started stays on Welcome, displays retryable error, keeps welcome unseen, and allows retry', async () => {
  let failSave = true;
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failSave) {
        throw new Error('Disk full');
      }
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Get Started' });

  // 1. First attempt fails
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  // Verify: no navigation, stays on Welcome, welcome not marked seen, error shown
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(hasSeenWelcome()).toBe(false);
  expect(getOnboardingStep()).toBeNull();

  const errorText = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorText.props.children).toBe('Could not save progress. Please try again.');
  expect(button.props.disabled).toBe(false);

  // 2. Retry succeeds
  failSave = false;
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(hasSeenWelcome()).toBe(true);
  expect(getOnboardingStep()).toBe('name');
  expect(mockNavigate).toHaveBeenCalledWith('NameEntry');
});

test('Guards duplicate taps on Get Started while save is pending', async () => {
  const slowPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 20));
    },
    remove: async () => {},
  };
  await hydrate(slowPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Get Started' });
  await ReactTestRenderer.act(async () => {
    const p1 = button.props.onPress();
    const p2 = button.props.onPress();
    await Promise.all([p1, p2]);
  });

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('NameEntry');
  expect(getOnboardingStep()).toBe('name');
});

test('Get Started button uses darker opaque blue when pressed', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Get Started' });
  const defaultStyle = button.props.style({ pressed: false });
  const pressedStyle = button.props.style({ pressed: true });

  const flatDefault = Array.isArray(defaultStyle) ? Object.assign({}, ...defaultStyle.filter(Boolean)) : defaultStyle;
  const flatPressed = Array.isArray(pressedStyle) ? Object.assign({}, ...pressedStyle.filter(Boolean)) : pressedStyle;

  expect(flatDefault.backgroundColor).toBe('#4F68D5');
  expect(flatPressed.backgroundColor).toBe('#4057BD');
  expect(flatPressed.opacity).toBeUndefined();
});

test('DevHub includes Welcome introduction preview row in __DEV__ and hides in release', () => {
  let devRenderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    devRenderer = ReactTestRenderer.create(<DevHub />);
  });
  const devTexts = devRenderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(devTexts).toContain('Welcome introduction');

  const originalDev = (globalThis as unknown as { __DEV__: boolean }).__DEV__;
  try {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    let prodRenderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      prodRenderer = ReactTestRenderer.create(<DevHub />);
    });
    const prodTexts = prodRenderer!.root.findAllByType(Text).map((t) => t.props.children);
    expect(prodTexts).not.toContain('Welcome introduction');
  } finally {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
  }
});
