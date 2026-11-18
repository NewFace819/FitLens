import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import WelcomeScreen from './welcome';
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
