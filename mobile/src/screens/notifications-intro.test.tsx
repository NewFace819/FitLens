import React from 'react';
import { AppState, type AppStateStatus, BackHandler, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import NotificationsIntroScreen from './notifications-intro';
import { clearAll, hydrate, type Persistence } from '../shared/storage';
import {
  getOnboardingMilestone,
  getOnboardingStep,
  isOnboardingCompleted,
} from '../modules/onboarding/onboarding';
import type { NotificationPermissionAdapter } from '../modules/onboarding/notification-permission';

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
      mockNavigationListeners[event] = mockNavigationListeners[event].filter(
        (l) => l !== cb
      );
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

function createFakeNotificationAdapter(
  overrides?: Partial<NotificationPermissionAdapter>
): NotificationPermissionAdapter {
  let isGranted = false;
  return {
    canRequestRuntimePermission: jest.fn().mockReturnValue(true),
    checkPermission: jest
      .fn()
      .mockImplementation(async () => (isGranted ? 'granted' : 'denied')),
    requestPermission: jest.fn().mockImplementation(async () => {
      isGranted = true;
      return 'granted';
    }),
    openSettings: jest.fn().mockResolvedValue(true),
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

test('NotificationsIntroScreen renders exact approved copy, reassurance note, and actions', async () => {
  const adapter = createFakeNotificationAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const texts = root.findAllByType(Text).map((t) => t.props.children);

  expect(texts).toContain('FITLENS');
  expect(texts).toContain('A little nudge,\nwhen it matters.');
  expect(texts).toContain(
    'Gentle reminders for workouts, check-ins, and moments worth looking back on.'
  );
  expect(texts).toContain('Enable gentle reminders');
  expect(texts).toContain('Maybe later');
  expect(texts).toContain('Only when it matters. Always your choice.');
  expect(adapter.requestPermission).not.toHaveBeenCalled();
});

test('Silently checks permission status on mount without triggering permission prompt', async () => {
  const adapter = createFakeNotificationAdapter();
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<NotificationsIntroScreen adapter={adapter} />);
  });

  expect(adapter.checkPermission).toHaveBeenCalledTimes(1);
  expect(adapter.requestPermission).not.toHaveBeenCalled();
});

test('API 33+ deliberate tap of Enable gentle reminders requests permission, updates to granted state, and Continue completes onboarding', async () => {
  const adapter = createFakeNotificationAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });

  await ReactTestRenderer.act(async () => {
    await enableBtn.props.onPress();
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // Success state shown with Continue button
  const statusCard = root.findByProps({ accessibilityLabel: 'Notifications allowed.' });
  expect(statusCard.props.accessibilityLabel).toBe('Notifications allowed.');
  expect(statusCard.props.accessibilityRole).toBeUndefined();
  expect(statusCard.props.accessibilityLiveRegion).toBe('polite');
  const cardTexts = statusCard.findAllByType(Text).map((t) => t.props.children);
  expect(cardTexts).toContain('Notifications allowed');
  expect(cardTexts).toContain('Allowed');
  expect(cardTexts).toContain(
    'You can change notification permissions anytime in Android settings.'
  );

  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  // Tapping Continue completes onboarding and navigates to Home
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(getOnboardingMilestone()).toBe('completed');
  expect(getOnboardingStep()).toBe('completed');
  expect(isOnboardingCompleted()).toBe(true);
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
});

test('API 33+ already granted on mount displays permission success state and Continue immediately', async () => {
  const adapter = createFakeNotificationAdapter({
    checkPermission: jest.fn().mockResolvedValue('granted'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  const statusCard = root.findByProps({
    accessibilityLabel: 'Notifications allowed.',
  });
  const cardTexts = statusCard.findAllByType(Text).map((t) => t.props.children);
  expect(cardTexts).toContain('Notifications allowed');
  expect(cardTexts).toContain('Allowed');
  expect(cardTexts).toContain(
    'You can change notification permissions anytime in Android settings.'
  );
});

test('API 33+ denial or dismissal shows neutral guidance, preserves Maybe later, and never auto re-prompts', async () => {
  const adapter = createFakeNotificationAdapter({
    requestPermission: jest.fn().mockResolvedValue('denied'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });

  await ReactTestRenderer.act(async () => {
    await enableBtn.props.onPress();
  });

  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // Neutral guidance shown
  const texts = root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Reminders aren’t enabled.');
  expect(texts).toContain(
    'You can try again now, or continue and turn on notifications later in settings.'
  );

  // Both actions accessible
  expect(
    root.findByProps({ accessibilityLabel: 'Enable gentle reminders' })
  ).toBeDefined();
  const maybeLaterBtn = root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  expect(maybeLaterBtn).toBeDefined();

  // Tapping Maybe later completes onboarding
  await ReactTestRenderer.act(async () => {
    await maybeLaterBtn.props.onPress();
  });

  expect(isOnboardingCompleted()).toBe(true);
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
  // Must never automatically re-prompt
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
});

test('API 33+ blocked (never_ask_again) shows settings guidance and Open Settings action', async () => {
  const adapter = createFakeNotificationAdapter({
    requestPermission: jest.fn().mockResolvedValue('blocked'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });

  await ReactTestRenderer.act(async () => {
    await enableBtn.props.onPress();
  });

  const texts = root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Notifications are turned off.');
  expect(texts).toContain(
    'To receive gentle reminders, enable notifications for FitLens in your device settings.'
  );

  const settingsBtn = root.findByProps({
    accessibilityLabel: 'Open Settings',
  });
  expect(settingsBtn).toBeDefined();
  expect(
    root.findByProps({ accessibilityLabel: 'Maybe later' })
  ).toBeDefined();

  // Tapping Open Settings calls adapter.openSettings()
  await ReactTestRenderer.act(async () => {
    await settingsBtn.props.onPress();
  });
  expect(adapter.openSettings).toHaveBeenCalledTimes(1);
});

test('Open settings failure displays error alert', async () => {
  const adapter = createFakeNotificationAdapter({
    requestPermission: jest.fn().mockResolvedValue('blocked'),
    openSettings: jest.fn().mockResolvedValue(false),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });
  await ReactTestRenderer.act(async () => {
    await enableBtn.props.onPress();
  });

  const settingsBtn = root.findByProps({
    accessibilityLabel: 'Open Settings',
  });
  await ReactTestRenderer.act(async () => {
    await settingsBtn.props.onPress();
  });

  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe(
    'Could not open settings. Please open Settings manually.'
  );
});

test('Request permission error displays error alert and preserves retry and skip path', async () => {
  const adapter = createFakeNotificationAdapter({
    requestPermission: jest
      .fn()
      .mockRejectedValue(new Error('Permission exception')),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });
  await ReactTestRenderer.act(async () => {
    await enableBtn.props.onPress();
  });

  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe(
    'Could not request notification permission. Please try again.'
  );

  // Both retry and skip available
  expect(
    root.findByProps({ accessibilityLabel: 'Enable gentle reminders' })
  ).toBeDefined();
  expect(
    root.findByProps({ accessibilityLabel: 'Maybe later' })
  ).toBeDefined();
});

test('Below API 33 has no runtime prompt, shows neutral guidance, and offers Continue and Open Settings', async () => {
  const adapter = createFakeNotificationAdapter({
    canRequestRuntimePermission: jest.fn().mockReturnValue(false),
    checkPermission: jest.fn().mockResolvedValue('unsupported'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  const texts = root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Notification settings');
  expect(texts).toContain(
    'This version of Android does not show a permission prompt for notifications. You can manage notification preferences anytime in device settings.'
  );

  // Continue button and Open Settings button are present
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();
  const settingsBtn = root.findByProps({
    accessibilityLabel: 'Open Settings',
  });
  expect(settingsBtn).toBeDefined();

  // Tapping Continue completes onboarding
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });
  expect(isOnboardingCompleted()).toBe(true);
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
});

test('Notification example uses native glass when the device supports refraction', async () => {
  const adapter = createFakeNotificationAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen adapter={adapter} />);
  });

  const root = renderer!.root;
  const glass = root.findByProps({ testID: 'liquid-glass-view' });
  expect(glass.props.refraction).toBe(true);
  expect(glass.props.interactive).toBe(false);

  await ReactTestRenderer.act(async () => {
    glass.props.onPipelineReady({
      nativeEvent: { tier: 'refraction', osVersion: 37, shaderCompiled: true },
    });
  });

  expect(root.findByProps({ testID: 'liquid-glass-view' })).toBeDefined();
  expect(root.findAllByProps({ id: 'exampleGlassFace' })).toHaveLength(0);
});

test.each(['runtime error', 'shader failure'])(
  'Notification example keeps its text and falls back to static glass after a %s',
  async (failure) => {
    const adapter = createFakeNotificationAdapter();
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<NotificationsIntroScreen adapter={adapter} />);
    });

    const root = renderer!.root;
    const getExampleBody = () =>
      root.findAllByType(Text).filter(
        (node) => node.props.children === 'Your scheduled workout begins at 6:30 PM.',
      );
    const [exampleBody] = getExampleBody();
    const glass = root.findByProps({ testID: 'liquid-glass-view' });
    await ReactTestRenderer.act(async () => {
      if (failure === 'runtime error') {
        glass.props.onError();
      } else {
        glass.props.onPipelineReady({
          nativeEvent: { tier: 'none', osVersion: 37, shaderCompiled: false },
        });
      }
    });

    expect(root.findAllByProps({ testID: 'liquid-glass-view' })).toHaveLength(0);
    expect(root.findAllByProps({ id: 'exampleGlassFace' }).length).toBeGreaterThan(0);
    expect(getExampleBody()).toEqual([exampleBody]);
  },
);

test('Regression: notification example remains visible with static glass after adapter resolves unsupported on API 24–32', async () => {
  const { getGlassCapabilities } = require('react-native-liquid-glassmorphism');
  (getGlassCapabilities as jest.Mock).mockReturnValueOnce({
    supported: true,
    tier: 'tint',
    osVersion: 24,
    supportsNativeGlass: false,
    supportsBlur: false,
    supportsRefraction: false,
    supportsShapes: false,
  });

  const adapter = createFakeNotificationAdapter({
    canRequestRuntimePermission: jest.fn().mockReturnValue(false),
    checkPermission: jest.fn().mockResolvedValue('unsupported'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;

  // Native glass view is absent on API 24–32
  const nativeGlassViews = root.findAllByProps({ testID: 'liquid-glass-view' });
  expect(nativeGlassViews).toHaveLength(0);

  // Assert that sample title and body are visible exactly once
  const texts = root.findAllByType(Text).map((t) => t.props.children);
  const sampleTitles = texts.filter(
    (t) => typeof t === 'string' && t.includes('A little time for yourself')
  );
  expect(sampleTitles).toHaveLength(1);

  const sampleBodies = texts.filter(
    (t) =>
      typeof t === 'string' &&
      t === 'Your scheduled workout begins at 6:30 PM.'
  );
  expect(sampleBodies).toHaveLength(1);

  // Preserve existing Settings and Continue actions for unsupported state
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  const settingsBtn = root.findByProps({
    accessibilityLabel: 'Open Settings',
  });
  expect(settingsBtn).toBeDefined();

  // Unsupported guidance banner is present
  expect(texts).toContain('Notification settings');
});

test('Never prompts on mount, focus, foreground return, after Health skip, or on Maybe later', async () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const appStateSpy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event: string, cb: any) => {
      if (event === 'change') {
        appStateListener = cb;
      }
      return {
        remove: jest.fn(() => {
          appStateListener = undefined;
        }),
      } as any;
    });

  const adapter = createFakeNotificationAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  // 1. Mount: no prompt
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // 2. Foreground return: no prompt
  await ReactTestRenderer.act(async () => {
    appStateListener?.('background');
    appStateListener?.('active');
  });
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // 3. Blur and refocus: no prompt
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  // 4. Maybe later: no prompt
  const maybeLaterBtn = renderer!.root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  await ReactTestRenderer.act(async () => {
    await maybeLaterBtn.props.onPress();
  });
  expect(adapter.requestPermission).not.toHaveBeenCalled();

  appStateSpy.mockRestore();
});

test('Foreground return from settings after grant updates screen to permission success state without prompting', async () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;
  const appStateSpy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event: string, cb: any) => {
      if (event === 'change') {
        appStateListener = cb;
      }
      return {
        remove: jest.fn(() => {
          appStateListener = undefined;
        }),
      } as any;
    });

  let currentGrant = false;
  const adapter = createFakeNotificationAdapter({
    checkPermission: jest
      .fn()
      .mockImplementation(async () => (currentGrant ? 'granted' : 'denied')),
    requestPermission: jest.fn().mockResolvedValue('denied'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });
  await ReactTestRenderer.act(async () => {
    await enableBtn.props.onPress();
  });

  // User backgrounded app, granted in Settings, and returned
  currentGrant = true;
  await ReactTestRenderer.act(async () => {
    appStateListener?.('background');
    appStateListener?.('active');
  });

  // Updated to granted with Continue button without permission prompt
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  expect(continueBtn).toBeDefined();

  appStateSpy.mockRestore();
});

test('Pressing Maybe later completes onboarding milestone and resets stack to Home', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const button = renderer!.root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(getOnboardingMilestone()).toBe('completed');
  expect(getOnboardingStep()).toBe('completed');
  expect(isOnboardingCompleted()).toBe(true);
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
});

test('Failed milestone save on Continue retains screen, preserves granted state, and allows retry', async () => {
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

  const adapter = createFakeNotificationAdapter({
    checkPermission: jest.fn().mockResolvedValue('granted'),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });

  // 1. Tapping Continue fails storage write
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  // Stays on screen
  expect(mockReset).not.toHaveBeenCalled();
  expect(isOnboardingCompleted()).toBe(false);

  // Displays error alert
  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe(
    'Could not save progress. Please try again.'
  );

  // Granted state is preserved
  expect(root.findByProps({ accessibilityLabel: 'Continue' })).toBeDefined();

  // 2. Retry Continue succeeds
  failSave = false;
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
  expect(isOnboardingCompleted()).toBe(true);
});

test('Failed milestone save on NotificationsIntro retains screen and shows retryable error', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Write failure');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const button = renderer!.root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });

  expect(getOnboardingMilestone()).toBeNull();
  expect(isOnboardingCompleted()).toBe(false);
  expect(mockReset).not.toHaveBeenCalled();

  const errorAlert = renderer!.root.findByProps({
    accessibilityRole: 'alert',
  });
  expect(errorAlert.props.children).toBe(
    'Could not save progress. Please try again.'
  );
});

test('Back button persists destination step health and calls nav.goBack() when canGoBack is true', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('health');
  expect(mockGoBack).toHaveBeenCalled();
});

test('Back button resets to HealthIntro when canGoBack is false', async () => {
  mockCanGoBackValue = false;
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(getOnboardingStep()).toBe('health');
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'HealthIntro' }],
  });
});

test('Failed Back persistence retains NotificationsIntro screen and displays retryable error', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Storage write failed');
    },
    remove: async () => {},
  };
  await hydrate(failingPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const backBtn = renderer!.root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  const errorAlert = renderer!.root.findByProps({
    accessibilityRole: 'alert',
  });
  expect(errorAlert.props.children).toBe(
    'Could not save progress. Please try again.'
  );
});

test('Guards concurrent Back and Maybe later while save is pending', async () => {
  const slowPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 20));
    },
    remove: async () => {},
  };
  await hydrate(slowPersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const root = renderer!.root;
  const skipBtn = root.findByProps({ accessibilityLabel: 'Maybe later' });
  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });

  await ReactTestRenderer.act(async () => {
    const p1 = skipBtn.props.onPress();
    const p2 = backBtn.props.onPress();
    const p3 = skipBtn.props.onPress();
    await Promise.all([p1, p2, p3]);
  });

  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
  expect(mockGoBack).not.toHaveBeenCalled();
});

test('Android hardware Back press navigates back to HealthIntro and saves step health', async () => {
  let backHandlerCallback: ((event?: any) => boolean | undefined) | undefined;
  const backSpy = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((event: string, callback: any) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return {
        remove: jest.fn(() => {
          backHandlerCallback = undefined;
        }),
      };
    });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  expect(backHandlerCallback).toBeDefined();

  // Focus scoping: blur removes listener, focus restores it
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });
  expect(backHandlerCallback).toBeUndefined();

  ReactTestRenderer.act(() => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });
  expect(backHandlerCallback).toBeDefined();

  await ReactTestRenderer.act(async () => {
    const handled = backHandlerCallback!();
    expect(handled).toBe(true);
  });

  expect(getOnboardingStep()).toBe('health');
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
  const backSpy = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((event: string, callback: any) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return {
        remove: jest.fn(() => {
          backHandlerCallback = undefined;
        }),
      };
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
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen />);
  });

  const skipBtn = renderer!.root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
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

  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
  expect(mockGoBack).not.toHaveBeenCalled();

  backSpy.mockRestore();
});

test('Pending permission request -> blur -> refocus with no grant clears waiting UI, keeps Maybe later usable, blocks duplicate request, and re-enables Enable once settled', async () => {
  let resolvePermission: (v: any) => void;
  const pendingPermissionPromise = new Promise((resolve) => {
    resolvePermission = resolve;
  });

  const adapter = createFakeNotificationAdapter({
    requestPermission: jest
      .fn()
      .mockImplementation(() => pendingPermissionPromise),
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });

  // 1. User taps Enable gentle reminders: request is pending
  await ReactTestRenderer.act(async () => {
    enableBtn.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // Status announcement Waiting for your choice… is active
  expect(
    root.findByProps({ children: 'Waiting for your choice…' })
  ).toBeDefined();

  // 2. User navigates away (e.g. Back) -> blur
  ReactTestRenderer.act(() => {
    mockNavigationListeners.blur?.forEach((cb) => cb());
  });

  // 3. User returns to NotificationsIntro (refocus) with request still pending
  await ReactTestRenderer.act(async () => {
    mockNavigationListeners.focus?.forEach((cb) => cb());
  });

  // Stale waiting UI is cleared
  expect(
    root.findAllByProps({ children: 'Waiting for your choice…' })
  ).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Enabling…' })).toHaveLength(0);

  // Enable button is disabled while native request unresolved
  const enableBtnRefocused = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });
  expect(
    enableBtnRefocused.props.accessibilityState?.disabled ?? false
  ).toBe(true);
  expect(enableBtnRefocused.props.disabled).toBe(true);

  // Maybe later remains usable
  const maybeLaterBtn = root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  expect(maybeLaterBtn.props.accessibilityState?.disabled ?? false).toBe(
    false
  );

  // Tapping Enable while pending does NOT launch second request
  await ReactTestRenderer.act(async () => {
    await enableBtnRefocused.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // 4. Request settles late (e.g. denied)
  await ReactTestRenderer.act(async () => {
    resolvePermission!('denied');
  });

  // Lock released, Enable button re-enabled
  expect(
    enableBtnRefocused.props.accessibilityState?.disabled ?? false
  ).toBe(false);
  expect(enableBtnRefocused.props.disabled).toBe(false);

  // Can launch a new request now
  (adapter.requestPermission as jest.Mock).mockResolvedValueOnce('granted');
  await ReactTestRenderer.act(async () => {
    await enableBtnRefocused.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(2);
});

test('Pending permission request -> Maybe later tapped -> destination save fails -> stays on screen, restores Maybe later, prevents duplicate prompt, preserves error across denial settlement, and allows explicit retry', async () => {
  let resolvePermission: (v: any) => void;
  const pendingPermissionPromise = new Promise((resolve) => {
    resolvePermission = resolve;
  });

  const adapter = createFakeNotificationAdapter({
    requestPermission: jest
      .fn()
      .mockImplementation(() => pendingPermissionPromise),
  });

  let failSave = true;
  const controllablePersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failSave) {
        throw new Error('Save failed');
      }
    },
    remove: async () => {},
  };
  await hydrate(controllablePersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });

  // 1. User taps Enable gentle reminders: request is pending
  await ReactTestRenderer.act(async () => {
    enableBtn.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // Status announcement "Waiting for your choice…" is shown
  expect(
    root.findByProps({ children: 'Waiting for your choice…' })
  ).toBeDefined();

  // 2. User taps Maybe later while request is pending, but save fails!
  const maybeLaterBtn = root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  await ReactTestRenderer.act(async () => {
    await maybeLaterBtn.props.onPress();
  });

  // Screen stays on Notifications, did not navigate
  expect(mockReset).not.toHaveBeenCalled();
  expect(isOnboardingCompleted()).toBe(false);

  // Save error is displayed
  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe(
    'Could not save progress. Please try again.'
  );

  // Abandoned waiting UI is cleared
  expect(
    root.findAllByProps({ children: 'Waiting for your choice…' })
  ).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Enabling…' })).toHaveLength(0);

  // Controls restored: Maybe later is usable
  expect(maybeLaterBtn.props.disabled).toBe(false);

  // Native lock is held: Enable button disabled while native request pending
  const enableBtnPending = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });
  expect(
    enableBtnPending.props.accessibilityState?.disabled ?? false
  ).toBe(true);
  expect(enableBtnPending.props.disabled).toBe(true);

  // Tapping Enable while pending does NOT trigger a duplicate request
  await ReactTestRenderer.act(async () => {
    await enableBtnPending.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // 3. Stale native request settles with denial
  await ReactTestRenderer.act(async () => {
    resolvePermission!('denied');
  });

  // Stale result does NOT navigate
  expect(mockReset).not.toHaveBeenCalled();

  // Stale result does NOT overwrite the visible save error
  const errorAlertAfterSettle = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlertAfterSettle.props.children).toBe(
    'Could not save progress. Please try again.'
  );

  // Native lock is released: Enable button is re-enabled
  expect(
    enableBtnPending.props.accessibilityState?.disabled ?? false
  ).toBe(false);
  expect(enableBtnPending.props.disabled).toBe(false);

  // 4. User does explicit retry of Enable gentle reminders
  (adapter.requestPermission as jest.Mock).mockResolvedValueOnce('granted');
  await ReactTestRenderer.act(async () => {
    await enableBtnPending.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(2);

  // Granted feedback card is shown
  const statusCard = root.findByProps({
    accessibilityLabel: 'Notifications allowed.',
  });
  expect(statusCard).toBeDefined();

  // 5. Storage recovers and tapping Continue completes onboarding
  failSave = false;
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
  expect(isOnboardingCompleted()).toBe(true);
});

test('Pending permission request -> Back tapped -> destination save fails -> preserves error, restores Back & Maybe later, native request rejects without crashing or error overwrite, allows explicit retry', async () => {
  let rejectPermission: (err: any) => void;
  const pendingPermissionPromise = new Promise((_, reject) => {
    rejectPermission = reject;
  });

  const adapter = createFakeNotificationAdapter({
    requestPermission: jest
      .fn()
      .mockImplementation(() => pendingPermissionPromise),
  });

  let failSave = true;
  const controllablePersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      if (failSave) {
        throw new Error('Save destination health failed');
      }
    },
    remove: async () => {},
  };
  await hydrate(controllablePersistence);

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NotificationsIntroScreen adapter={adapter} />
    );
  });

  const root = renderer!.root;
  const enableBtn = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });

  // 1. User taps Enable gentle reminders: request is pending
  await ReactTestRenderer.act(async () => {
    enableBtn.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // Status announcement "Waiting for your choice…" is shown
  expect(
    root.findByProps({ children: 'Waiting for your choice…' })
  ).toBeDefined();

  // 2. User taps Back button while request is pending, but save fails!
  const backBtn = root.findByProps({ accessibilityLabel: 'Back' });
  await ReactTestRenderer.act(async () => {
    await backBtn.props.onPress();
  });

  // Screen stays on Notifications, did not navigate back
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  // Save error is displayed
  const errorAlert = root.findByProps({ accessibilityRole: 'alert' });
  expect(errorAlert.props.children).toBe(
    'Could not save progress. Please try again.'
  );

  // Abandoned waiting UI is cleared
  expect(
    root.findAllByProps({ children: 'Waiting for your choice…' })
  ).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Enabling…' })).toHaveLength(0);

  // Controls restored: Back and Maybe later are usable
  expect(backBtn.props.disabled).toBe(false);
  const maybeLaterBtn = root.findByProps({
    accessibilityLabel: 'Maybe later',
  });
  expect(maybeLaterBtn.props.disabled).toBe(false);

  // Native lock is held: Enable button disabled while native request pending
  const enableBtnPending = root.findByProps({
    accessibilityLabel: 'Enable gentle reminders',
  });
  expect(
    enableBtnPending.props.accessibilityState?.disabled ?? false
  ).toBe(true);

  // Tapping Enable while pending does NOT trigger a duplicate request
  await ReactTestRenderer.act(async () => {
    await enableBtnPending.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(1);

  // 3. Stale native request settles with a REJECTION (e.g. OS dialog error/dismissal)
  await ReactTestRenderer.act(async () => {
    rejectPermission!(new Error('Android native dialog rejected'));
  });

  // No stale navigation
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();

  // Rejection does NOT overwrite the visible save error
  const errorAlertAfterReject = root.findByProps({
    accessibilityRole: 'alert',
  });
  expect(errorAlertAfterReject.props.children).toBe(
    'Could not save progress. Please try again.'
  );

  // Native lock is released: Enable button is re-enabled
  expect(
    enableBtnPending.props.accessibilityState?.disabled ?? false
  ).toBe(false);
  expect(enableBtnPending.props.disabled).toBe(false);

  // 4. Explicit retry of Enable gentle reminders succeeds
  (adapter.requestPermission as jest.Mock).mockResolvedValueOnce('granted');
  await ReactTestRenderer.act(async () => {
    await enableBtnPending.props.onPress();
  });
  expect(adapter.requestPermission).toHaveBeenCalledTimes(2);

  const statusCard = root.findByProps({
    accessibilityLabel: 'Notifications allowed.',
  });
  expect(statusCard).toBeDefined();

  // 5. User taps Continue once save recovers and completes onboarding
  failSave = false;
  const continueBtn = root.findByProps({ accessibilityLabel: 'Continue' });
  await ReactTestRenderer.act(async () => {
    await continueBtn.props.onPress();
  });

  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Home' }],
  });
  expect(isOnboardingCompleted()).toBe(true);
});

test('End of onboarding shows the shared safety notice (#45)', async () => {
  const { SAFETY_NOTICE } = require('../shared/safety');
  const adapter = createFakeNotificationAdapter();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NotificationsIntroScreen adapter={adapter} />);
  });
  const texts = renderer!.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain(SAFETY_NOTICE);
});
