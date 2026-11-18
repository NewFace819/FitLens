import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import WelcomeScreen from './welcome';
import DevHub from './dev-hub';
import { clearAll, hydrate } from '../shared/storage';
import { hasSeenWelcome } from '../modules/welcome/welcome';

const mockReset = jest.fn();

jest.mock('../navigation', () => ({
  useAppNavigation: () => ({
    reset: mockReset,
    navigate: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
}));

beforeEach(async () => {
  await hydrate(null);
  clearAll();
  mockReset.mockClear();
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

test('Pressing Get Started persists welcome acknowledgment and navigates to Home', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  expect(hasSeenWelcome()).toBe(false);

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Get Started' });
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });

  expect(hasSeenWelcome()).toBe(true);
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
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
