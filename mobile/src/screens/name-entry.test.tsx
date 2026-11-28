import React from 'react';
import { BackHandler, Keyboard, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import NameEntryScreen from './name-entry';
import WelcomeScreen from './welcome';
import { clearAll, hydrate, type Persistence } from '../shared/storage';
import { getProfile, hasConfirmedName, saveProfileName } from '../modules/profile/profile';
import { getOnboardingStep, saveOnboardingStep } from '../modules/onboarding/onboarding';
import { hasSeenWelcome, markWelcomeSeen } from '../modules/welcome/welcome';

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

test('NameEntryScreen renders exact approved copy and controls', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const texts = root.findAllByType(Text).map((t) => t.props.children);

  expect(texts).toContain('FITLENS');
  expect(texts).toContain('What should\nI call you?');

  const input = root.findByType(TextInput);
  expect(input.props.placeholder).toBe('Your name');
  expect(input.props.accessibilityLabel).toBe('Your name');
  expect(input.props.maxLength).toBe(40);
  expect(input.props.autoComplete).toBe('name-given');
  expect(input.props.returnKeyType).toBe('done');

  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });
  expect(confirmBtn).toBeTruthy();
  expect(confirmBtn.props.accessibilityState.disabled).toBe(true);

  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });
  expect(backBtn).toBeTruthy();
});

test('Confirm button is disabled for empty or whitespace-only input and enabled for valid text', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const input = root.findByType(TextInput);
  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });

  // Initially empty
  expect(confirmBtn.props.accessibilityState.disabled).toBe(true);

  // Whitespace only
  ReactTestRenderer.act(() => {
    input.props.onChangeText('    ');
  });
  expect(confirmBtn.props.accessibilityState.disabled).toBe(true);

  // Valid input
  ReactTestRenderer.act(() => {
    input.props.onChangeText('Đỗ Huy');
  });
  expect(confirmBtn.props.accessibilityState.disabled).toBe(false);

  // Cleared
  ReactTestRenderer.act(() => {
    input.props.onChangeText('');
  });
  expect(confirmBtn.props.accessibilityState.disabled).toBe(true);
});

test('Submitting valid name saves profile and onboarding step greeting and navigates to Greeting', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const input = root.findByType(TextInput);
  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });

  ReactTestRenderer.act(() => {
    input.props.onChangeText('  Đỗ Huy  ');
  });

  await ReactTestRenderer.act(async () => {
    await confirmBtn.props.onPress();
  });

  expect(getProfile().name).toBe('Đỗ Huy');
  expect(hasConfirmedName()).toBe(true);
  expect(getOnboardingStep()).toBe('greeting');
  expect(mockNavigate).toHaveBeenCalledWith('Greeting');
  expect(mockReset).not.toHaveBeenCalled();

  // Screen is NOT left disabled (isSubmitting released in finally)
  expect(confirmBtn.props.accessibilityState.disabled).toBe(false);
});

test('Submitting via Done keyboard action saves profile and navigates to Greeting', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const input = root.findByType(TextInput);

  ReactTestRenderer.act(() => {
    input.props.onChangeText('Anne-Marie');
  });

  await ReactTestRenderer.act(async () => {
    await input.props.onSubmitEditing();
  });

  expect(getProfile().name).toBe('Anne-Marie');
  expect(getOnboardingStep()).toBe('greeting');
  expect(mockNavigate).toHaveBeenCalledWith('Greeting');
  expect(mockReset).not.toHaveBeenCalled();
});

test('Forward → Back → forward re-enables controls and navigates to Greeting without stuck isSubmitting', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const input = root.findByType(TextInput);
  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });

  ReactTestRenderer.act(() => {
    input.props.onChangeText('Alex');
  });

  // 1. Forward to Greeting
  await ReactTestRenderer.act(async () => {
    await confirmBtn.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('Greeting');

  // Controls must be re-enabled immediately (not latched in isSubmitting)
  expect(confirmBtn.props.accessibilityState.disabled).toBe(false);
  expect(input.props.editable).toBe(true);

  // 2. Submit forward again from the same mounted screen (simulating user returning via Back)
  await ReactTestRenderer.act(async () => {
    await confirmBtn.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledTimes(2);
});

test('Failed save leaves user on NameEntry with text intact and displays retryable error', async () => {
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
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const input = root.findByType(TextInput);
  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });

  ReactTestRenderer.act(() => {
    input.props.onChangeText('Alex');
  });

  await ReactTestRenderer.act(async () => {
    await confirmBtn.props.onPress();
  });

  // Must not navigate to Home
  expect(mockReset).not.toHaveBeenCalled();

  // Input text must be preserved
  expect(input.props.value).toBe('Alex');

  // Error message displayed
  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Your name could not be saved. Please try again.');

  // Editing input clears the error message
  ReactTestRenderer.act(() => {
    input.props.onChangeText('Alex Smith');
  });
  expect(root.findAllByProps({ accessibilityRole: 'alert' }).length).toBe(0);
});

test('Back button persists destination step welcome and calls nav.goBack() during current session', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('welcome');
  expect(mockGoBack).toHaveBeenCalled();
});

test('Back button uses reset to replace root NameEntry with Welcome when canGoBack is false', async () => {
  mockCanGoBackValue = false;
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('welcome');
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Welcome' }],
  });
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('Failed Back persistence retains NameEntry screen and displays retryable error', async () => {
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
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
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

test('Guards concurrent Back and Confirm while save is pending', async () => {
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
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const root = renderer!.root;
  const input = root.findByType(TextInput);
  const confirmBtn = root.findByProps({ accessibilityLabel: 'Confirm name' });
  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });

  ReactTestRenderer.act(() => {
    input.props.onChangeText('Đỗ Huy');
  });

  await ReactTestRenderer.act(async () => {
    const p1 = confirmBtn.props.onPress();
    const p2 = backBtn.props.onPress();
    const p3 = confirmBtn.props.onPress();
    await Promise.all([p1, p2, p3]);
  });

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('Greeting');
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();
});

test('Android system Back dismisses soft keyboard if open, or navigates Back if closed', async () => {
  await saveOnboardingStep('name');

  let backHandlerCallback: ((event?: any) => boolean | undefined) | undefined;
  const backSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, callback: any) => {
    if (event === 'hardwareBackPress') {
      backHandlerCallback = callback;
    }
    return { remove: jest.fn(() => { backHandlerCallback = undefined; }) };
  });

  const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const keyboardSpy = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  expect(backHandlerCallback).toBeDefined();

  // 1. Soft keyboard is open: hardwareBackPress dismisses keyboard, consumes event (returns true), route and step unchanged
  const handledWhenOpen = backHandlerCallback!();
  expect(handledWhenOpen).toBe(true);
  expect(dismissSpy).toHaveBeenCalled();
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(getOnboardingStep()).toBe('name');

  // 2. Soft keyboard is dismissed: hardwareBackPress returns true and navigates Back
  keyboardSpy.mockReturnValue(false);
  await ReactTestRenderer.act(async () => {
    const handledWhenClosed = backHandlerCallback!();
    expect(handledWhenClosed).toBe(true);
  });

  expect(getOnboardingStep()).toBe('welcome');
  expect(mockGoBack).toHaveBeenCalled();

  // 3. Focus scoping: listener removed on blur, reattached on focus
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.();
  });
  expect(backHandlerCallback).toBeUndefined();

  ReactTestRenderer.act(() => {
    mockNavigationListeners.focus?.();
  });
  expect(backHandlerCallback).toBeDefined();

  // 4. Removed on unmount
  ReactTestRenderer.act(() => {
    renderer.unmount();
  });
  expect(backHandlerCallback).toBeUndefined();

  backSpy.mockRestore();
  keyboardSpy.mockRestore();
  dismissSpy.mockRestore();
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
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const input = renderer!.root.findByType(TextInput);
  ReactTestRenderer.act(() => {
    input.props.onChangeText('Đỗ Huy');
  });

  const confirmBtn = renderer!.root.findByProps({ accessibilityLabel: 'Confirm name' });
  // Start submitting
  let submitPromise: Promise<void>;
  ReactTestRenderer.act(() => {
    submitPromise = confirmBtn.props.onPress();
  });

  // While saving, Back press should be consumed (return true) without triggering handleBack
  expect(backHandlerCallback).toBeDefined();
  const handledWhileSaving = backHandlerCallback!();
  expect(handledWhileSaving).toBe(true);
  expect(mockGoBack).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    await submitPromise;
  });

  expect(mockNavigate).toHaveBeenCalledWith('Greeting');
  expect(mockGoBack).not.toHaveBeenCalled();

  backSpy.mockRestore();
});

test('Mounting NameEntryScreen restores previously saved profile name', async () => {
  await saveProfileName('Đỗ Huy');

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const input = renderer!.root.findByType(TextInput);
  expect(input.props.value).toBe('Đỗ Huy');

  const confirmBtn = renderer!.root.findByProps({ accessibilityLabel: 'Confirm name' });
  expect(confirmBtn.props.accessibilityState.disabled).toBe(false);
});

test('regression: restart before confirming → NameEntry at root → Back → Welcome → Get Started → NameEntry', async () => {
  markWelcomeSeen();
  expect(hasSeenWelcome()).toBe(true);

  // 1. App resumed at root NameEntry (canGoBack is false)
  mockCanGoBackValue = false;
  let nameEntryRenderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    nameEntryRenderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  // 2. Press Back on root NameEntry
  const backBtn1 = nameEntryRenderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn1.props.onPress();
  });

  // Root Back uses replacement (reset) rather than navigation (navigate)
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Welcome' }],
  });
  expect(mockNavigate).not.toHaveBeenCalled();

  // Saved Welcome acknowledgment must NOT be cleared on Back
  expect(hasSeenWelcome()).toBe(true);
  expect(getOnboardingStep()).toBe('welcome');

  // 3. User is now on Welcome (only Welcome in stack)
  mockReset.mockClear();
  mockNavigate.mockClear();

  let welcomeRenderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    welcomeRenderer = ReactTestRenderer.create(<WelcomeScreen />);
  });

  // 4. Press Get Started on Welcome
  const getStartedBtn = welcomeRenderer!.root.findByProps({ accessibilityLabel: 'Get Started' });
  await ReactTestRenderer.act(async () => {
    await getStartedBtn.props.onPress();
  });

  // Get Started adds exactly one NameEntry above Welcome
  expect(mockNavigate).toHaveBeenCalledWith('NameEntry');
  expect(mockReset).not.toHaveBeenCalled();
  expect(getOnboardingStep()).toBe('name');

  // 5. User is on second NameEntry with Welcome as previous screen (canGoBack is true)
  mockCanGoBackValue = true;
  mockGoBack.mockClear();

  let secondNameEntryRenderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    secondNameEntryRenderer = ReactTestRenderer.create(<NameEntryScreen />);
  });

  const backBtn2 = secondNameEntryRenderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn2.props.onPress();
  });

  // Normal goBack is used from the second NameEntry, popping cleanly back to Welcome
  expect(mockGoBack).toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();
  expect(getOnboardingStep()).toBe('welcome');
});
