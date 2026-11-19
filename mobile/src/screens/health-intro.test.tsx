import React from 'react';
import { AppState, type AppStateStatus, BackHandler, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import HealthIntroScreen, { formatStepCount } from './health-intro';
import { clearAll, hydrate, type Persistence } from '../shared/storage';
import { getOnboardingMilestone, getOnboardingStep } from '../modules/onboarding/onboarding';
import type { HealthConnectAdapter } from '../modules/health/health-connect';

const mockReset = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockCanGoBackValue = true;
let mockIsFocusedValue = true;
const mockNavigationListeners: Record<string, Array<() => void>> = {};

const mockNavigation = {
  reset: mockReset,
  navigate: mockNavigate,
  goBack: mockGoBack,
  canGoBack: () => mockCanGoBackValue,
  isFocused: () => mockIsFocusedValue,
  addListener: (event: string, cb: () => void) => {
    if (!mockNavigationListeners[event]) {
      mockNavigationListeners[event] = [];
    }
    mockNavigationListeners[event].push(cb);
    return () => {
      mockNavigationListeners[event] = mockNavigationListeners[event].filter((l) => l !== cb);
    };
  },
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => mockNavigation,
  };
});

function createFakeAdapter(overrides?: Partial<HealthConnectAdapter>): HealthConnectAdapter {
  let isGranted = false;
  return {
    getSdkStatus: jest.fn().mockResolvedValue('available'),
    checkPermission: jest.fn().mockImplementation(async () => isGranted),
    requestPermission: jest.fn().mockImplementation(async () => {
      isGranted = true;
      return true;
    }),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 6240 }),
    openHealthConnectSettings: jest.fn().mockResolvedValue(true),
    openHealthConnectProvider: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

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

test('HealthIntroScreen renders exact approved copy, privacy note, and actions', async () => {
  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const texts = root.findAllByType(Text).map((t) => t.props.children);

  expect(texts).toContain('FITLENS');
  expect(texts).toContain('See your movement\ncome to life.');
  expect(texts).toContain('Bring your daily activity into FitLens with Health Connect.');
  expect(texts).toContain('Connect Health Connect');
  expect(texts).toContain('Not now');
  expect(texts).toContain('You choose what to share.');
  expect(adapter.requestPermission).not.toHaveBeenCalled();
});

test('Silently checks SDK status and permission on mount without triggering permission prompt', async () => {
  const adapter = createFakeAdapter();
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  expect(adapter.getSdkStatus).toHaveBeenCalledTimes(1);
  expect(adapter.checkPermission).toHaveBeenCalledTimes(1);
  expect(adapter.requestPermission).not.toHaveBeenCalled();
});

test('Displays formatted steps and Continue button when permission is already granted on mount', async () => {
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 6240 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  const previewStatus = root.findByProps({ accessibilityRole: 'status' });
  expect(previewStatus.props.accessibilityLabel).toBe('Steps today: 6,240 steps');

  // Tapping Continue saves milestone and navigates to NotificationsIntro
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(getOnboardingMilestone()).toBe('notifications');
  expect(getOnboardingStep()).toBe('notifications');
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
});

test('Displays zero/empty state when permission is granted but no step data is available yet', async () => {
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: false, steps: null }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  expect(root.findByProps({ accessibilityLabel: 'Continue' })).toBeDefined();

  const previewStatus = root.findByProps({ accessibilityRole: 'status' });
  expect(previewStatus.props.accessibilityLabel).toBe('No steps are available for today yet.');

  const texts = root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('No steps are available for today yet.');
});

test('User taps Connect Health Connect -> grants -> updates to connected state with steps', async () => {
  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 1250 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  await ReactTestRenderer.act(async () => {
    await connectBtn.props.onPress();
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
  expect(adapter.getTodaySteps).toHaveBeenCalled();

  const continueBtn = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  const previewStatus = renderer!.root.findByProps({ accessibilityLabel: 'Steps today: 1,250 steps' });
  expect(previewStatus).toBeDefined();
});

test('User taps Connect Health Connect -> denies -> shows polite notice and Try again button', async () => {
  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockResolvedValue(false),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  await ReactTestRenderer.act(async () => {
    await connectBtn.props.onPress();
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  const texts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Step access wasn’t granted.');

  const retryBtn = renderer!.root.findByProps({ accessibilityLabel: 'Try again' });
  expect(retryBtn).toBeDefined();

  const notNowBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  expect(notNowBtn).toBeDefined();
});

test('Shows update banner and Update button when Health Connect requires provider update', async () => {
  const adapter = createFakeAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('provider-update-required'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const texts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Health Connect needs to be installed or updated.');

  const updateBtn = renderer!.root.findByProps({ accessibilityLabel: 'Update Health Connect' });
  expect(updateBtn).toBeDefined();

  await ReactTestRenderer.act(async () => {
    await updateBtn.props.onPress();
  });

  expect(adapter.openHealthConnectProvider).toHaveBeenCalledTimes(1);

  // Still provides Not now to proceed cleanly
  const notNowBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  expect(notNowBtn).toBeDefined();
});

test('Shows unavailable banner and single Not now button when Health Connect is unsupported', async () => {
  const adapter = createFakeAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('unavailable'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const texts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Health Connect isn’t available on this device.');

  const notNowBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  expect(notNowBtn).toBeDefined();

  // Primary Connect Health Connect button is NOT shown
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Connect Health Connect' })).toHaveLength(0);

  // Can still proceed cleanly with Not now
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
});

test('Displays error message and retry when requestPermission throws an error', async () => {
  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockRejectedValue(new Error('Permission exception')),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  await ReactTestRenderer.act(async () => {
    await connectBtn.props.onPress();
  });

  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not connect to Health Connect. Please try again.');
});

test('Displays error message and retry when getTodaySteps throws an error', async () => {
  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockRejectedValue(new Error('Failed reading steps')),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  await ReactTestRenderer.act(async () => {
    await connectBtn.props.onPress();
  });

  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not read your steps. Please try again.');
});

test('Guards double taps on Connect button while connection request is in flight', async () => {
  let resolveRequest: (v: boolean) => void;
  const slowRequest = new Promise<boolean>((resolve) => {
    resolveRequest = resolve;
  });

  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockImplementation(() => slowRequest),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
    connectBtn.props.onPress(); // duplicate tap
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    resolveRequest!(true);
  });
});

test('Tapping Not now while connection is in-flight invalidates late resolve and navigates forward cleanly', async () => {
  let resolveRequest: (v: boolean) => void;
  const slowRequest = new Promise<boolean>((resolve) => {
    resolveRequest = resolve;
  });

  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockImplementation(() => slowRequest),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  const notNowBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });

  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');

  // Late resolution of slow request
  await ReactTestRenderer.act(async () => {
    resolveRequest!(true);
  });

  // Does not cause second navigation or error
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test('Rechecks permission silently on navigation focus without re-prompting', async () => {
  let isGranted = false;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockImplementation(async () => isGranted),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  expect(adapter.checkPermission).toHaveBeenCalledTimes(1);

  // User backgrounded app / navigated away and granted in settings
  mockNavigationListeners.blur?.forEach((cb) => cb());
  isGranted = true;

  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  expect(adapter.checkPermission).toHaveBeenCalledTimes(2);
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  const continueBtn = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();
});

test('Pressing Not now saves notifications milestone and navigates to NotificationsIntro without bypassing', async () => {
  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(getOnboardingMilestone()).toBe('notifications');
  expect(getOnboardingStep()).toBe('notifications');
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
  expect(mockNavigate).not.toHaveBeenCalledWith('Home');
  expect(mockReset).not.toHaveBeenCalled();

  expect(button.props.accessibilityState?.disabled ?? false).toBe(false);
});

test('Forward → Back → forward re-enables controls and navigates to NotificationsIntro without stuck isSubmitting', async () => {
  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });

  // 1. First forward tap
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');

  expect(button.props.accessibilityState?.disabled ?? false).toBe(false);

  // 2. Second forward tap from same mounted screen
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledTimes(2);
});

test('Failed milestone save on HealthIntro retains screen and shows retryable error', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Write failure');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const button = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(getOnboardingMilestone()).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');
});

test('Back button persists destination step greeting and calls nav.goBack() when canGoBack is true', async () => {
  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('greeting');
  expect(mockGoBack).toHaveBeenCalled();
});

test('Back button resets to Greeting when canGoBack is false', async () => {
  mockCanGoBackValue = false;
  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('greeting');
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Greeting' }],
  });
});

test('Failed Back persistence retains HealthIntro screen and displays retryable error', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Storage write failed');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
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

test('Guards concurrent Back and Skip while save is pending', async () => {
  const slowPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 20));
    },
    remove: async () => {},
  };
  await hydrate(slowPersistence);

  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const skipBtn = root.findByProps({ accessibilityLabel: 'Not now' });
  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });

  await ReactTestRenderer.act(async () => {
    const p1 = skipBtn.props.onPress();
    const p2 = backBtn.props.onPress();
    const p3 = skipBtn.props.onPress();
    await Promise.all([p1, p2, p3]);
  });

  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();
});

test('Android hardware Back press navigates back to Greeting and saves step greeting', async () => {
  let backHandlerCallback: ((event?: any) => boolean | undefined) | undefined;
  const backSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, callback: any) => {
    if (event === 'hardwareBackPress') {
      backHandlerCallback = callback;
    }
    return { remove: jest.fn(() => { backHandlerCallback = undefined; }) };
  });

  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  expect(backHandlerCallback).toBeDefined();

  // Focus scoping: blur removes listener, focus restores it
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });
  expect(backHandlerCallback).toBeUndefined();

  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });
  expect(backHandlerCallback).toBeDefined();

  await ReactTestRenderer.act(async () => {
    const handled = backHandlerCallback!();
    expect(handled).toBe(true);
  });

  expect(getOnboardingStep()).toBe('greeting');
  expect(mockGoBack).toHaveBeenCalled();

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

  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const skipBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  let skipPromise: Promise<void>;
  ReactTestRenderer.act(() => {
    skipPromise = skipBtn.props.onPress();
  });

  expect(backHandlerCallback).toBeDefined();
  const handledWhileSaving = backHandlerCallback!();
  expect(handledWhileSaving).toBe(true);
  expect(mockGoBack).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    await skipPromise;
  });

  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
  expect(mockGoBack).not.toHaveBeenCalled();

  backSpy.mockRestore();
});

test('Collapsible details toggles What FitLens can read', async () => {
  const adapter = createFakeAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const toggle = renderer!.root.findByProps({ accessibilityLabel: 'What FitLens can read' });
  expect(renderer!.root.findAllByProps({ children: '• Daily step count.' })).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    toggle.props.onPress();
  });

  const bullet = renderer!.root.findByProps({ children: '• Daily step count.' });
  expect(bullet).toBeDefined();
});

test('formatStepCount formats step integers with standard grouping', () => {
  expect(formatStepCount(0)).toBe('0');
  expect(formatStepCount(123)).toBe('123');
  expect(formatStepCount(6240)).toBe('6,240');
  expect(formatStepCount(1500000)).toBe('1,500,000');
});

test('Already granted on mount but read fails -> shows read error -> retrying read directly succeeds without opening permission dialog', async () => {
  let failRead = true;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockImplementation(async () => {
      if (failRead) {
        throw new Error('READ_STEPS_ERROR: Query timeout');
      }
      return { hasData: true, steps: 6240 };
    }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  // Verify read error is shown
  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not read your steps. Please try again.');

  const tryAgainBtn = renderer!.root.findByProps({ accessibilityLabel: 'Try again' });
  expect(tryAgainBtn).toBeDefined();

  // Retry reading steps directly
  failRead = false;
  await ReactTestRenderer.act(async () => {
    await tryAgainBtn.props.onPress();
  });

  // Critical: Retrying a read with a current grant must NOT open the system permission dialog
  expect(adapter.requestPermission).not.toHaveBeenCalled();
  expect(adapter.getTodaySteps).toHaveBeenCalledTimes(2);

  // Screen now shows steps total and Continue button
  const continueBtn = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  const previewStatus = renderer!.root.findByProps({ accessibilityLabel: 'Steps today: 6,240 steps' });
  expect(previewStatus).toBeDefined();
});

test('Distinguishes genuine count of zero from absent samples as rendered', async () => {
  // 1. Genuine zero count: hasData is true, steps is 0
  const zeroAdapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 0 }),
  });

  let rendererZero: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    rendererZero = ReactTestRenderer.create(<HealthIntroScreen adapter={zeroAdapter} />);
  });

  const zeroStatus = rendererZero!.root.findByProps({ accessibilityLabel: 'Steps today: 0 steps' });
  expect(zeroStatus).toBeDefined();
  expect(rendererZero!.root.findByProps({ accessibilityLabel: 'Continue' })).toBeDefined();

  // 2. Absent sample: hasData is false, steps is null
  const emptyAdapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: false, steps: null }),
  });

  let rendererEmpty: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    rendererEmpty = ReactTestRenderer.create(<HealthIntroScreen adapter={emptyAdapter} />);
  });

  const emptyStatus = rendererEmpty!.root.findByProps({ accessibilityLabel: 'No steps are available for today yet.' });
  expect(emptyStatus).toBeDefined();
  const texts = rendererEmpty!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('No steps are available for today yet.');
  expect(rendererEmpty!.root.findByProps({ accessibilityLabel: 'Continue' })).toBeDefined();
});

test('Surfaces error when checking granted permissions fails on silent refresh instead of inferring denial', async () => {
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockRejectedValue(new Error('CHECK_PERMISSION_ERROR: IPC failure')),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  // Surfaces error alert
  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not connect to Health Connect. Please try again.');

  // Does NOT display "Step access wasn't granted." banner
  const banners = renderer!.root.findAllByProps({ children: 'Step access wasn’t granted.' });
  expect(banners).toHaveLength(0);

  // Provides retry button and Not now
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Try again' })).toBeDefined();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Not now' })).toBeDefined();
});

test('Blur / refocus invalidates old in-flight requests so late results do not override newer state', async () => {
  let resolveSlowRequest: (v: boolean) => void;
  const slowRequest = new Promise<boolean>((resolve) => {
    resolveSlowRequest = resolve;
  });

  let isUnavailable = false;
  const adapter = createFakeAdapter({
    getSdkStatus: jest.fn().mockImplementation(async () => (isUnavailable ? 'unavailable' : 'available')),
    requestPermission: jest.fn().mockImplementation(() => slowRequest),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  // User taps Connect Health Connect
  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  // Screen blurs (user navigates away)
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });

  // Device state changes while away, then screen refocuses
  isUnavailable = true;
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // Now the old slow request from before blur completes
  await ReactTestRenderer.act(async () => {
    resolveSlowRequest!(true);
  });

  // Screen must maintain current state (unavailable banner), NOT overridden by old late result
  const texts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Health Connect isn’t available on this device.');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Continue' })).toHaveLength(0);
});

test('Failed Continue persistence releases lock and allows successful retry', async () => {
  let failWrite = true;
  const flakyPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failWrite) {
        throw new Error('Temporary disk full');
      }
    },
    remove: async () => {},
  };
  await hydrate(flakyPersistence);

  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 6240 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const continueBtn = renderer!.root.findByProps({ accessibilityLabel: 'Continue' });

  // First press fails
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(getOnboardingMilestone()).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();

  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');

  // Lock must be released
  expect(continueBtn.props.accessibilityState?.disabled ?? false).toBe(false);

  // Second press succeeds
  failWrite = false;
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(getOnboardingMilestone()).toBe('notifications');
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
});

test('Foreground return after revocation clears displayed total without prompting', async () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((event: string, cb: any) => {
    if (event === 'change') {
      appStateListener = cb;
    }
    return { remove: jest.fn(() => { appStateListener = undefined; }) } as any;
  });

  let hasGrant = true;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockImplementation(async () => hasGrant),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 6240 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  // Initially connected with steps
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue' })).toBeDefined();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Steps today: 6,240 steps' })).toBeDefined();

  // User backgrounds app, goes to Settings, and revokes step permission
  hasGrant = false;

  await ReactTestRenderer.act(async () => {
    appStateListener?.('background');
    appStateListener?.('active');
  });

  // Foreground refresh must NEVER trigger a permission prompt
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // Displayed step total must be cleared
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Steps today: 6,240 steps' })).toHaveLength(0);

  // Notice banner shown for revoked access
  const texts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Step access wasn’t granted.');

  // Continue button is removed, Try again is present
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Continue' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Try again' })).toBeDefined();

  appStateSpy.mockRestore();
});

test('Open provider failure displays error and keeps retry / skip path', async () => {
  const adapter = createFakeAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('provider-update-required'),
    openHealthConnectProvider: jest.fn().mockResolvedValue(false),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const updateBtn = renderer!.root.findByProps({ accessibilityLabel: 'Update Health Connect' });
  await ReactTestRenderer.act(async () => {
    await updateBtn.props.onPress();
  });

  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not open store. Please search for Health Connect in Google Play.');

  // User is not trapped: Not now remains accessible
  const notNowBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  expect(notNowBtn).toBeDefined();
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
});

test('Foreground return from provider-update-required to available with no grant switches CTA to Connect Health Connect without requesting permission', async () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((event: string, cb: any) => {
    if (event === 'change') {
      appStateListener = cb;
    }
    return { remove: jest.fn(() => { appStateListener = undefined; }) } as any;
  });

  let sdkStatus: 'provider-update-required' | 'available' = 'provider-update-required';
  const adapter = createFakeAdapter({
    getSdkStatus: jest.fn().mockImplementation(async () => sdkStatus),
    checkPermission: jest.fn().mockResolvedValue(false),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  // Verify initial provider-update UI
  const initialTexts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(initialTexts).toContain('Health Connect needs to be installed or updated.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Update Health Connect' })).toBeDefined();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Connect Health Connect' })).toHaveLength(0);

  // User leaves app to update Health Connect, provider updates to available with no step grant yet
  sdkStatus = 'available';

  await ReactTestRenderer.act(async () => {
    appStateListener?.('background');
    appStateListener?.('active');
  });

  // Critical: Silent recheck must NEVER request permission
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // Stale provider banner is cleared
  const updatedTexts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(updatedTexts).not.toContain('Health Connect needs to be installed or updated.');
  expect(updatedTexts).not.toContain('Step access wasn’t granted.');

  // CTA switches to Connect Health Connect and Not now
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Update Health Connect' })).toHaveLength(0);
  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  expect(connectBtn).toBeDefined();
  expect(connectBtn.props.accessibilityState?.disabled ?? false).toBe(false);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Not now' })).toBeDefined();

  appStateSpy.mockRestore();
});

test('Refocus from unavailable to available with no grant switches to ready-to-connect state without requesting permission', async () => {
  let sdkStatus: 'unavailable' | 'available' = 'unavailable';
  const adapter = createFakeAdapter({
    getSdkStatus: jest.fn().mockImplementation(async () => sdkStatus),
    checkPermission: jest.fn().mockResolvedValue(false),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  // Verify initial unavailable UI
  const initialTexts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(initialTexts).toContain('Health Connect isn’t available on this device.');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Connect Health Connect' })).toHaveLength(0);

  // Screen blurs, SDK becomes available, screen refocuses
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });
  sdkStatus = 'available';

  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // Never prompts
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // Unavailable banner cleared
  const updatedTexts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(updatedTexts).not.toContain('Health Connect isn’t available on this device.');

  // Ready-to-connect CTA is rendered
  const connectBtn = renderer!.root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  expect(connectBtn).toBeDefined();
  expect(connectBtn.props.accessibilityState?.disabled ?? false).toBe(false);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Not now' })).toBeDefined();
});

test('Pending permission request -> Not now -> failed destination save stays on Health, displays save error, exits waiting state, and retrying Not now succeeds once settled', async () => {
  let resolvePermission: (v: boolean) => void;
  const pendingPermissionPromise = new Promise<boolean>((resolve) => {
    resolvePermission = resolve;
  });

  let failSave = true;
  const flakyPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failSave) {
        throw new Error('Storage write failed');
      }
    },
    remove: async () => {},
  };
  await hydrate(flakyPersistence);

  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockImplementation(() => pendingPermissionPromise),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 5000 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const connectBtn = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  // 1. User taps Connect Health Connect: native request is now in flight
  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // Waiting announcement is active
  const waitingAnnouncement = root.findByProps({ children: 'Waiting for your choice…' });
  expect(waitingAnnouncement).toBeDefined();

  // 2. While request is pending, user taps Not now -> destination save fails
  const notNowBtn = root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  // Stays on Health screen
  expect(mockNavigate).not.toHaveBeenCalled();

  // Exits waiting state: waiting announcement cleared
  expect(root.findAllByProps({ children: 'Waiting for your choice…' })).toHaveLength(0);

  // Displays progress save error alert
  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');

  // Not now action is usable once progress write settles
  expect(notNowBtn.props.accessibilityState?.disabled ?? false).toBe(false);

  // Connect button cannot launch a second native dialog while first dialog is still active
  const connectBtnDuringPending = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  expect(connectBtnDuringPending.props.accessibilityState?.disabled ?? false).toBe(true);
  expect(connectBtnDuringPending.props.disabled).toBe(true);

  // Tapping Connect while dialog is open does not trigger a second permission request
  await ReactTestRenderer.act(async () => {
    await connectBtnDuringPending.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // 3. Native dialog finishes / settles late in OS
  await ReactTestRenderer.act(async () => {
    resolvePermission!(true);
  });

  // Stale late result does NOT navigate, does NOT set connected steps card, does NOT overwrite save error
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(root.findAllByProps({ accessibilityLabel: 'Steps today: 5,000 steps' })).toHaveLength(0);
  expect(root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Could not save progress. Please try again.');

  // Connect button is now re-enabled after native request settled
  expect(connectBtnDuringPending.props.accessibilityState?.disabled ?? false).toBe(false);
  expect(connectBtnDuringPending.props.disabled).toBe(false);

  // 4. User retries Not now -> succeeds
  failSave = false;
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  // Destination opens once on successful retry
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
  expect(getOnboardingMilestone()).toBe('notifications');
});

test('Pending permission request -> Back -> failed greeting save recovers cleanly and retrying Back succeeds', async () => {
  let resolvePermission: (v: boolean) => void;
  const pendingPermissionPromise = new Promise<boolean>((resolve) => {
    resolvePermission = resolve;
  });

  let failSave = true;
  const flakyPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failSave) {
        throw new Error('Storage write failed');
      }
    },
    remove: async () => {},
  };
  await hydrate(flakyPersistence);

  const adapter = createFakeAdapter({
    requestPermission: jest.fn().mockImplementation(() => pendingPermissionPromise),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const connectBtn = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });

  // 1. User taps Connect Health Connect: native request is in flight
  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  // 2. User taps Back while request is pending -> destination save fails
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  // Stays on Health
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  // Waiting announcement cleared, save error displayed
  expect(root.findAllByProps({ children: 'Waiting for your choice…' })).toHaveLength(0);
  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');

  // Connect button disabled while dialog is open
  const connectBtnPending = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  expect(connectBtnPending.props.accessibilityState?.disabled ?? false).toBe(true);

  // Back button lock is released and usable
  expect(backBtn.props.accessibilityState?.disabled ?? false).toBe(false);

  // 3. Stale request settles
  await ReactTestRenderer.act(async () => {
    resolvePermission!(true);
  });

  expect(mockGoBack).not.toHaveBeenCalled();
  expect(connectBtnPending.props.accessibilityState?.disabled ?? false).toBe(false);

  // 4. Retry Back -> succeeds
  failSave = false;
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('greeting');
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});

test('Silent recheck does not clear progress-save error before user can see it', async () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((event: string, cb: any) => {
    if (event === 'change') {
      appStateListener = cb;
    }
    return { remove: jest.fn(() => { appStateListener = undefined; }) } as any;
  });

  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Write error');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  let hasGrant = false;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockImplementation(async () => hasGrant),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 3500 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const notNowBtn = renderer!.root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  // Error is displayed
  const errorAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe('Could not save progress. Please try again.');

  // App is backgrounded, user grants in settings, and returns to foreground (silent recheck triggers)
  hasGrant = true;
  await ReactTestRenderer.act(async () => {
    appStateListener?.('background');
    appStateListener?.('active');
  });

  // adapter.requestPermission must NOT have been called
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // Progress save error must NOT be cleared by silent refresh even after permission was granted
  const retainedAlert = renderer!.root.findByProps({ accessibilityRole: 'alert' });
  expect(retainedAlert.props.children).toBe('Could not save progress. Please try again.');

  appStateSpy.mockRestore();
});

test('Pending Connect -> successful Not now -> blur -> refocus with no grant clears waiting UI, keeps skip usable, prevents second Connect while unresolved, and re-enables Connect once settled', async () => {
  let resolvePermission: (v: boolean) => void;
  const pendingPermissionPromise = new Promise<boolean>((resolve) => {
    resolvePermission = resolve;
  });

  let hasGrant = false;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockImplementation(async () => hasGrant),
    requestPermission: jest.fn().mockImplementation(() => pendingPermissionPromise),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const connectBtn = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  // 1. Start Connect Health Connect and leave its native request unresolved
  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
  expect(root.findByProps({ children: 'Waiting for your choice…' })).toBeDefined();

  // 2. Tap Not now and let progress save succeed -> navigates to NotificationsIntro
  const notNowBtn = root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  expect(mockNavigate).toHaveBeenCalledWith('NotificationsIntro');
  expect(getOnboardingMilestone()).toBe('notifications');

  // Screen blurs when navigating forward
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });

  // 3. Return from Notifications to the already-mounted Health screen (refocus) with no grant
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // Assert stale waiting UI clears
  expect(root.findAllByProps({ children: 'Waiting for your choice…' })).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Connecting…' })).toHaveLength(0);

  // Ready-to-connect buttons are shown: Connect Health Connect and Not now
  const connectBtnRefocused = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  expect(connectBtnRefocused).toBeDefined();
  const notNowRefocused = root.findByProps({ accessibilityLabel: 'Not now' });
  expect(notNowRefocused).toBeDefined();

  // Skip ("Not now") still works
  expect(notNowRefocused.props.accessibilityState?.disabled ?? false).toBe(false);
  expect(notNowRefocused.props.disabled).toBe(false);

  // Connect button is disabled while native request is unresolved
  expect(connectBtnRefocused.props.accessibilityState?.disabled ?? false).toBe(true);
  expect(connectBtnRefocused.props.disabled).toBe(true);

  // Tapping Connect while native request is unresolved cannot launch a second request
  await ReactTestRenderer.act(async () => {
    await connectBtnRefocused.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // 4. Settle the old request (resolved with false / no grant)
  await ReactTestRenderer.act(async () => {
    resolvePermission!(false);
  });

  // Verify Connect can be used again
  expect(connectBtnRefocused.props.accessibilityState?.disabled ?? false).toBe(false);
  expect(connectBtnRefocused.props.disabled).toBe(false);

  // Can launch a new Connect request now that previous request settled
  let resolveSecond: (v: boolean) => void;
  const secondPromise = new Promise<boolean>((resolve) => {
    resolveSecond = resolve;
  });
  (adapter.requestPermission as jest.Mock).mockImplementationOnce(() => secondPromise);

  await ReactTestRenderer.act(async () => {
    connectBtnRefocused.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(2);

  await ReactTestRenderer.act(async () => {
    resolveSecond!(false);
  });
});

test('Pending Connect -> Not now -> blur -> refocus -> late native success triggers silent recheck, updates connected state with steps, and does not navigate', async () => {
  let resolvePermission: (v: boolean) => void;
  const pendingPermissionPromise = new Promise<boolean>((resolve) => {
    resolvePermission = resolve;
  });

  let hasGrant = false;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockImplementation(async () => hasGrant),
    requestPermission: jest.fn().mockImplementation(() => pendingPermissionPromise),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 7200 }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const connectBtn = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  // 1. Start Connect
  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  // 2. Skip to NotificationsIntro
  const notNowBtn = root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  mockNavigate.mockClear();

  // Screen blurs
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });

  // 3. Return from NotificationsIntro to Health screen
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // 4. Old native request settles with grant
  hasGrant = true;
  await ReactTestRenderer.act(async () => {
    resolvePermission!(true);
  });

  // Silent recheck updates to connected state with steps
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  const previewStatus = root.findByProps({ accessibilityRole: 'status' });
  expect(previewStatus.props.accessibilityLabel).toBe('Steps today: 7,200 steps');

  // Must not automatically navigate
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('Pending Connect -> Not now -> blur -> refocus -> late native failure releases lock without error banner and re-enables Connect', async () => {
  let rejectPermission: (err: any) => void;
  const pendingPermissionPromise = new Promise<boolean>((_resolve, reject) => {
    rejectPermission = reject;
  });

  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(false),
    requestPermission: jest.fn().mockImplementation(() => pendingPermissionPromise),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const connectBtn = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });

  // 1. Start Connect
  await ReactTestRenderer.act(async () => {
    connectBtn.props.onPress();
  });

  // 2. Skip
  const notNowBtn = root.findByProps({ accessibilityLabel: 'Not now' });
  await ReactTestRenderer.act(async () => {
    await notNowBtn.props.onPress();
  });

  // Blur then refocus
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  const connectBtnRefocused = root.findByProps({ accessibilityLabel: 'Connect Health Connect' });
  expect(connectBtnRefocused.props.accessibilityState?.disabled ?? false).toBe(true);

  // 3. Old native request rejects with error
  await ReactTestRenderer.act(async () => {
    rejectPermission!(new Error('Native Activity cancelled'));
  });

  // Lock released, no connect-error banner shown
  expect(connectBtnRefocused.props.accessibilityState?.disabled ?? false).toBe(false);
  expect(root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
});

test('Invalidated read after blur does not overwrite newer focus session refresh data when resolving late', async () => {
  let resolveOldRead: (v: any) => void;
  const oldReadPromise = new Promise<{ hasData: boolean; steps: number }>((resolve) => {
    resolveOldRead = resolve;
  });

  let callCount = 0;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // Initial read starts and hangs
        return oldReadPromise;
      }
      // Newer read on refocus resolves immediately with fresh steps
      return { hasData: true, steps: 9500 };
    }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;

  // Initial read is pending (callCount === 1)
  expect(callCount).toBe(1);

  // User leaves screen (blur)
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });

  // User returns to screen (refocus) -> triggers newer silent refresh
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // Newer read resolved with 9,500 steps
  expect(callCount).toBe(2);
  const previewStatus = root.findByProps({ accessibilityRole: 'status' });
  expect(previewStatus.props.accessibilityLabel).toBe('Steps today: 9,500 steps');

  // Now the old invalidated read resolves with stale steps (1,200)
  await ReactTestRenderer.act(async () => {
    resolveOldRead!({ hasData: true, steps: 1200 });
  });

  // Stale result must NOT overwrite newer refresh data
  expect(previewStatus.props.accessibilityLabel).toBe('Steps today: 9,500 steps');
  expect(root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
});

test('Invalidated read after blur does not display error when rejecting late after newer focus session', async () => {
  let rejectOldRead: (err: any) => void;
  const oldReadPromise = new Promise<{ hasData: boolean; steps: number }>((_resolve, reject) => {
    rejectOldRead = reject;
  });

  let callCount = 0;
  const adapter = createFakeAdapter({
    checkPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return oldReadPromise;
      }
      return { hasData: true, steps: 8400 };
    }),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HealthIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;

  // Leave screen and refocus
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // Newer refresh succeeded with 8,400 steps
  const previewStatus = root.findByProps({ accessibilityRole: 'status' });
  expect(previewStatus.props.accessibilityLabel).toBe('Steps today: 8,400 steps');

  // Old invalidated read rejects
  await ReactTestRenderer.act(async () => {
    rejectOldRead!(new Error('Old read failed'));
  });

  // Must not overwrite with read-error
  expect(root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
  expect(previewStatus.props.accessibilityLabel).toBe('Steps today: 8,400 steps');
});
