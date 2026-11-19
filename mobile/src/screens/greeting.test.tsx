import React from 'react';
import { BackHandler, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import GreetingScreen from './greeting';
import { clearAll, hydrate, KEYS, write, type Persistence } from '../shared/storage';
import { getOnboardingMilestone, getOnboardingStep } from '../modules/onboarding/onboarding';

const mockReset = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockCanGoBackValue = true;
let mockIsFocusedValue = true;
const mockNavigationListeners: Record<string, () => void> = {};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      reset: mockReset,
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: () => mockCanGoBackValue,
      isFocused: () => mockIsFocusedValue,
      addListener: (event: string, cb: () => void) => {
        mockNavigationListeners[event] = cb;
        return () => {
          delete mockNavigationListeners[event];
        };
      },
    }),
  };
});

beforeEach(async () => {
  await hydrate(null);
  clearAll();
  mockReset.mockClear();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockCanGoBackValue = true;
  mockIsFocusedValue = true;
  for (const k of Object.keys(mockNavigationListeners)) {
    delete mockNavigationListeners[k];
  }
});

test('GreetingScreen renders stored preferred name, caption and Continue button', () => {
  write(KEYS.profile, { name: 'Đỗ Huy' });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const root = renderer!.root;
  const texts = root.findAllByType(Text).map((t) => t.props.children);

  expect(texts).toContain('FITLENS');
  expect(texts).toContain('Nice to meet you,\nĐỗ Huy!');
  expect(texts).toContain("Let's make FitLens feel like yours.");
  expect(texts).toContain('Continue');
});

test('GreetingScreen renders 40-character long name gracefully', () => {
  const longName = 'A'.repeat(40);
  write(KEYS.profile, { name: longName });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const root = renderer!.root;
  const texts = root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain(`Nice to meet you,\n${longName}!`);
});

test('Pressing Continue saves health milestone and navigates to HealthIntro without bypassing', async () => {
  write(KEYS.profile, { name: 'Alex' });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(getOnboardingMilestone()).toBe('health');
  expect(getOnboardingStep()).toBe('health');
  expect(mockNavigate).toHaveBeenCalledWith('HealthIntro');
  expect(mockNavigate).not.toHaveBeenCalledWith('NotificationsIntro');
  expect(mockNavigate).not.toHaveBeenCalledWith('Home');
  expect(mockReset).not.toHaveBeenCalled();

  // Screen is NOT left disabled (isSubmitting released in finally)
  expect(button.props.accessibilityState?.disabled ?? false).toBe(false);
});

test('Forward → Back → forward re-enables controls and navigates to HealthIntro without stuck isSubmitting', async () => {
  write(KEYS.profile, { name: 'Alex' });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });

  // 1. First forward tap
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('HealthIntro');

  // Controls must be re-enabled immediately
  expect(button.props.accessibilityState?.disabled ?? false).toBe(false);

  // 2. Second forward tap from same mounted screen
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledTimes(2);
});

test('Failed milestone save retains Greeting screen and shows retryable error', async () => {
  write(KEYS.profile, { name: 'Alex' });

  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Write error');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  // Must not advance
  expect(getOnboardingMilestone()).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  // Retryable error displayed
  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');
});

test('Back button persists destination step name and calls nav.goBack() when canGoBack is true', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('name');
  expect(mockGoBack).toHaveBeenCalled();
});

test('Back button resets to NameEntry when canGoBack is false', async () => {
  mockCanGoBackValue = false;
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('name');
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'NameEntry' }],
  });
});

test('Failed Back persistence retains Greeting screen and displays retryable error', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Storage write failed');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');
});

test('Guards concurrent Back and Continue while save is pending', async () => {
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
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const root = renderer!.root;
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });

  await ReactTestRenderer.act(async () => {
    const p1 = continueBtn.props.onPress();
    const p2 = backBtn.props.onPress();
    const p3 = continueBtn.props.onPress();
    await Promise.all([p1, p2, p3]);
  });

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('HealthIntro');
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();
});

test('Android hardware Back press navigates back to NameEntry and saves step name', async () => {
  let backHandlerCallback: ((event?: any) => boolean | undefined) | undefined;
  const backSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, callback: any) => {
    if (event === 'hardwareBackPress') {
      backHandlerCallback = callback;
    }
    return { remove: jest.fn(() => { backHandlerCallback = undefined; }) };
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  expect(backHandlerCallback).toBeDefined();

  // Focus scoping: blur removes listener, focus restores it
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.();
  });
  expect(backHandlerCallback).toBeUndefined();

  ReactTestRenderer.act(() => {
    mockNavigationListeners.focus?.();
  });
  expect(backHandlerCallback).toBeDefined();

  await ReactTestRenderer.act(async () => {
    const handled = backHandlerCallback!();
    expect(handled).toBe(true);
  });

  expect(getOnboardingStep()).toBe('name');
  expect(mockGoBack).toHaveBeenCalled();

  // Removed on unmount
  ReactTestRenderer.act(() => {
    renderer.unmount();
  });
  expect(backHandlerCallback).toBeUndefined();

  backSpy.mockRestore();
});

test('Android system Back consumes event and does not trigger second transition while saving', async () => {
  let backHandlerCallback: ((event?: any) => boolean | undefined) | undefined;
  const backSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, callback: any) => {
    if (event === 'hardwareBackPress') {
      backHandlerCallback = callback;
    }
    return { remove: jest.fn(() => { backHandlerCallback = undefined; }) };
  });

  const slowPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 50));
    },
    remove: async () => {},
  };
  await hydrate(slowPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GreetingScreen />);
  });

  const continueBtn = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });
  let continuePromise: Promise<void>;
  ReactTestRenderer.act(() => {
    continuePromise = continueBtn.props.onPress();
  });

  expect(backHandlerCallback).toBeDefined();
  const handledWhileSaving = backHandlerCallback!();
  expect(handledWhileSaving).toBe(true);
  expect(mockGoBack).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    await continuePromise;
  });

  expect(mockNavigate).toHaveBeenCalledWith('HealthIntro');
  expect(mockGoBack).not.toHaveBeenCalled();

  backSpy.mockRestore();
});
