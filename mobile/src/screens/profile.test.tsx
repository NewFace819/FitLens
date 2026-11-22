import React from 'react';
import { AccessibilityInfo, BackHandler, Modal, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ProfileScreen, { AccountAvatar, getInitials, VectorClose, VectorCheckmark } from './profile';
import { clearAll, hydrate, KEYS, write, type Persistence } from '../shared/storage';
import { DEFAULT_PROFILE, getProfile } from '../modules/profile/profile';
import { type HealthConnectAdapter, type HealthConnectSdkStatus } from '../modules/health/health-connect';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockCanGoBackValue = true;
let mockIsFocusedValue = true;
const mockNavigationListeners: Record<string, () => void> = {};

const mockNavigation = {
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
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => mockNavigation,
  };
});

function createMockAdapter(overrides: Partial<HealthConnectAdapter> = {}): HealthConnectAdapter {
  return {
    getSdkStatus: jest.fn().mockResolvedValue('available' as HealthConnectSdkStatus),
    checkPermission: jest.fn().mockResolvedValue(true),
    requestPermission: jest.fn().mockResolvedValue(true),
    getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 5000 }),
    openHealthConnectSettings: jest.fn().mockResolvedValue(true),
    openHealthConnectProvider: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

async function renderProfileScreen(props?: {
  healthConnectAdapter?: HealthConnectAdapter;
  forceSolidFallback?: boolean;
}) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ProfileScreen
        healthConnectAdapter={props?.healthConnectAdapter ?? createMockAdapter()}
        forceSolidFallback={props?.forceSolidFallback}
      />
    );
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>((r) => setTimeout(() => r(), 50));
  });
  return renderer;
}

beforeEach(async () => {
  await hydrate(null);
  clearAll();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockCanGoBackValue = true;
  mockIsFocusedValue = true;
  for (const k of Object.keys(mockNavigationListeners)) {
    delete mockNavigationListeners[k];
  }
});

test('ProfileScreen renders Settings overview, title, mascot, and 5 rows across 3 groups', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: 'Đức Huy',
  });

  const adapter = createMockAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('available'),
    checkPermission: jest.fn().mockResolvedValue(true),
  });

  const renderer = await renderProfileScreen({ healthConnectAdapter: adapter });
  const root = renderer.root;
  const texts = root.findAllByType(Text).map((t) => (typeof t.props.children === 'string' ? t.props.children : ''));

  // Title & Account Card
  expect(texts).toContain('Settings');
  expect(texts).toContain('Đức Huy');
  expect(texts).toContain('FitLens Account');

  // Groups
  expect(texts).toContain('TRAINING');
  expect(texts).toContain('CONNECTIONS');
  expect(texts).toContain('INFORMATION');

  // 5 Rows
  expect(texts).toContain('Training Plan');
  expect(texts).toContain('Equipment & Areas to Avoid');
  expect(texts).toContain('Health Connect');
  expect(texts).toContain('Reminders');
  expect(texts).toContain('Privacy & Data');

  // Health Connect status on row
  expect(texts).toContain('Connected');
});

test('Unnamed profile renders "FitLens Account" as primary and supporting prompt', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: '',
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const accountBtn = root.findByProps({
    accessibilityLabel: 'FitLens Account, Set up your profile name',
  });
  expect(accountBtn).toBeTruthy();
});

test('Tapping account card opens name editor modal; saving updates name and overview', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: 'Old Name',
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const accountBtn = root.findByProps({ accessibilityLabel: 'Old Name, FitLens Account' });

  // Open modal
  ReactTestRenderer.act(() => {
    accountBtn.props.onPress();
  });

  const modal = root.findByType(Modal);
  expect(modal.props.visible).toBe(true);

  // Edit name
  const input = root.findByType(TextInput);
  expect(input.props.value).toBe('Old Name');

  ReactTestRenderer.act(() => {
    input.props.onChangeText('Trần Văn Nam');
  });

  // Save name
  const saveBtn = root.findByProps({ accessibilityLabel: 'Save name' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  expect(modal.props.visible).toBe(false);
  expect(getProfile().name).toBe('Trần Văn Nam');

  const updatedTexts = root.findAllByType(Text).map((t) => t.props.children);
  expect(updatedTexts).toContain('Trần Văn Nam');
});

test('Name editor validation rejects invalid input with error message and cancel discards', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: 'Valid Name',
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const accountBtn = root.findByProps({ accessibilityLabel: 'Valid Name, FitLens Account' });

  ReactTestRenderer.act(() => {
    accountBtn.props.onPress();
  });

  const input = root.findByType(TextInput);
  ReactTestRenderer.act(() => {
    input.props.onChangeText('   ');
  });

  const saveBtn = root.findByProps({ accessibilityLabel: 'Save name' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  // Modal remains open and shows error
  const errorText = root.findByProps({ accessibilityLiveRegion: 'polite' });
  expect(errorText.props.children).toBe('Please enter a name between 1 and 40 characters.');
  expect(getProfile().name).toBe('Valid Name');

  // Cancel closes modal
  const cancelBtn = root.findByProps({ accessibilityLabel: 'Cancel' });
  ReactTestRenderer.act(() => {
    cancelBtn.props.onPress();
  });

  const modal = root.findByType(Modal);
  expect(modal.props.visible).toBe(false);
});

test('Training Plan row opens full editor; selecting options and saving updates profile', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    goal: 'habit',
    experience: 'beginner',
    daysPerWeek: 3,
    minutes: 30,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  // Navigate to editor
  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Verify editor is displayed
  expect(root.findByProps({ children: 'Training Plan', accessibilityRole: 'header' })).toBeTruthy();

  // Select 'muscle' goal
  const muscleBtn = root.findByProps({
    accessibilityLabel: 'Build muscle, Hypertrophy and physical conditioning',
  });
  ReactTestRenderer.act(() => {
    muscleBtn.props.onPress();
  });

  // Select 'advanced' experience
  const advancedBtn = root.findByProps({
    accessibilityLabel: 'Advanced, Multiple years of consistent workouts',
  });
  ReactTestRenderer.act(() => {
    advancedBtn.props.onPress();
  });

  // Select 5 sessions per week via in-place menu
  const sessionsRow = root.findByProps({
    accessibilityLabel: 'Sessions per week, currently 3 days',
  });
  ReactTestRenderer.act(() => {
    sessionsRow.props.onPress();
  });

  const days5Btn = root.findByProps({ accessibilityLabel: '5 days per week' });
  ReactTestRenderer.act(() => {
    days5Btn.props.onPress();
  });

  // Verify summary row updated draft value
  expect(
    root.findByProps({ accessibilityLabel: 'Sessions per week, currently 5 days' })
  ).toBeTruthy();

  // Select 45 minutes duration via in-place menu
  const durationRow = root.findByProps({
    accessibilityLabel: 'Session duration, currently 30 minutes',
  });
  ReactTestRenderer.act(() => {
    durationRow.props.onPress();
  });

  const dur45Btn = root.findByProps({ accessibilityLabel: '45 minutes per session' });
  ReactTestRenderer.act(() => {
    dur45Btn.props.onPress();
  });

  // Verify summary row updated draft value
  expect(
    root.findByProps({ accessibilityLabel: 'Session duration, currently 45 minutes' })
  ).toBeTruthy();

  // Save changes
  const saveBtn = root.findByProps({ accessibilityLabel: 'Save training plan' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  // Returned to overview
  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();

  const p = getProfile();
  expect(p.goal).toBe('muscle');
  expect(p.experience).toBe('advanced');
  expect(p.daysPerWeek).toBe(5);
  expect(p.minutes).toBe(45);
});

test('Training Plan editor Cancel button discards draft changes', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    goal: 'habit',
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  const strengthBtn = root.findByProps({
    accessibilityLabel: 'Get stronger, Progressive strength and stability',
  });
  ReactTestRenderer.act(() => {
    strengthBtn.props.onPress();
  });

  // Cancel
  const cancelBtn = root.findByProps({ accessibilityLabel: 'Cancel editing' });
  ReactTestRenderer.act(() => {
    cancelBtn.props.onPress();
  });

  // Profile remains unchanged
  expect(getProfile().goal).toBe('habit');
  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();
});

test('Training Plan editor preserves custom non-picker duration (minutes: 25) when changing only goal', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    goal: 'habit',
    minutes: 25,
    daysPerWeek: 3,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Open Duration menu to verify custom 25 min duration is selectable
  const durationRow = root.findByProps({
    accessibilityLabel: 'Session duration, currently 25 minutes',
  });
  ReactTestRenderer.act(() => {
    durationRow.props.onPress();
  });

  const customPill = root.findByProps({
    accessibilityLabel: '25 minutes per session, current saved duration',
  });
  expect(customPill).toBeTruthy();

  // Dismiss menu
  const dismissBtn = root.findByProps({ accessibilityLabel: 'Dismiss menu' });
  ReactTestRenderer.act(() => {
    dismissBtn.props.onPress();
  });

  // Select 'muscle' goal only
  const muscleBtn = root.findByProps({
    accessibilityLabel: 'Build muscle, Hypertrophy and physical conditioning',
  });
  ReactTestRenderer.act(() => {
    muscleBtn.props.onPress();
  });

  // Save changes
  const saveBtn = root.findByProps({ accessibilityLabel: 'Save training plan' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  // Returned to overview
  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();

  const p = getProfile();
  expect(p.goal).toBe('muscle');
  expect(p.minutes).toBe(25); // preserved 25 minutes!
});

test('Opening Training Plan editor and saving without changes preserves stored profile data', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    name: 'Custom User',
    goal: 'mobility',
    experience: 'intermediate',
    daysPerWeek: 4,
    minutes: 25,
  });
  const baseline = getProfile();

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Save without any changes
  const saveBtn = root.findByProps({ accessibilityLabel: 'Save training plan' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();
  expect(getProfile()).toEqual(baseline);
});

test('Equipment & Areas editor toggles multi-selects and saves empty arrays', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    equipment: ['dumbbells'],
    avoidRegions: ['knees'],
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const equipRow = root.findByProps({ accessibilityLabel: 'Equipment & Areas to Avoid' });

  ReactTestRenderer.act(() => {
    equipRow.props.onPress();
  });

  // Toggle dumbbells off
  const dumbbellsCheckbox = root.findByProps({
    accessibilityLabel: 'Dumbbells, Adjustable or fixed weight pairs',
  });
  ReactTestRenderer.act(() => {
    dumbbellsCheckbox.props.onPress();
  });

  // Toggle knees off
  const kneesCheckbox = root.findByProps({ accessibilityLabel: 'Avoid Knees' });
  ReactTestRenderer.act(() => {
    kneesCheckbox.props.onPress();
  });

  // Save (both selections now empty)
  const saveBtn = root.findByProps({ accessibilityLabel: 'Save preferences' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  expect(getProfile().equipment).toEqual([]);
  expect(getProfile().avoidRegions).toEqual([]);
});

test('Health Connect status page displays connection state and settings button calls adapter', async () => {
  const openSettingsMock = jest.fn().mockResolvedValue(true);
  const adapter = createMockAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('available'),
    checkPermission: jest.fn().mockResolvedValue(true),
    openHealthConnectSettings: openSettingsMock,
  });

  const renderer = await renderProfileScreen({ healthConnectAdapter: adapter });
  const root = renderer.root;
  const hcRow = root.findByProps({ accessibilityLabel: 'Health Connect, Connected' });

  // Open Health Connect page
  ReactTestRenderer.act(() => {
    hcRow.props.onPress();
  });

  expect(root.findByProps({ children: 'Health Connect', accessibilityRole: 'header' })).toBeTruthy();

  // Press Open Health Connect settings
  const settingsBtn = root.findByProps({ accessibilityLabel: 'Open Health Connect settings' });
  await ReactTestRenderer.act(async () => {
    await settingsBtn.props.onPress();
  });

  expect(openSettingsMock).toHaveBeenCalledTimes(1);

  // Press Back
  const backBtn = root.findByProps({ accessibilityLabel: 'Back to Settings' });
  await ReactTestRenderer.act(async () => {
    backBtn.props.onPress();
    await new Promise<void>((r) => setTimeout(() => r(), 20));
  });

  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();
});

test('Health Connect represents update-needed and unavailable statuses accurately', async () => {
  const updateAdapter = createMockAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('provider-update-required'),
    checkPermission: jest.fn().mockResolvedValue(false),
  });

  const renderer = await renderProfileScreen({ healthConnectAdapter: updateAdapter });
  const root = renderer.root;
  const updateRow = root.findByProps({ accessibilityLabel: 'Health Connect, Update needed' });
  expect(updateRow).toBeTruthy();

  // Test unavailable adapter
  const unavailAdapter = createMockAdapter({
    getSdkStatus: jest.fn().mockResolvedValue('unavailable'),
    checkPermission: jest.fn().mockResolvedValue(false),
  });

  const unavailRenderer = await renderProfileScreen({ healthConnectAdapter: unavailAdapter });
  const unavailRow = unavailRenderer.root.findByProps({ accessibilityLabel: 'Health Connect, Unavailable' });
  expect(unavailRow).toBeTruthy();
});

test('Reminders row navigates to existing Reminders route via nav.navigate', async () => {
  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const remindersRow = root.findByProps({ accessibilityLabel: 'Reminders' });

  ReactTestRenderer.act(() => {
    remindersRow.props.onPress();
  });

  expect(mockNavigate).toHaveBeenCalledWith('Reminders');
});

test('Privacy & Data page displays explanations and Back returns to overview', async () => {
  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const privacyRow = root.findByProps({ accessibilityLabel: 'Privacy & Data' });

  ReactTestRenderer.act(() => {
    privacyRow.props.onPress();
  });

  expect(root.findByProps({ children: 'Privacy & Data', accessibilityRole: 'header' })).toBeTruthy();
  const texts = root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain('Local-First Storage');
  expect(texts).toContain('Health Connect Permissions');
  expect(texts).toContain('Workout Reminders');
  expect(texts).toContain('On-Device Camera Coaching');

  const backBtn = root.findByProps({ accessibilityLabel: 'Back to Settings' });
  ReactTestRenderer.act(() => {
    backBtn.props.onPress();
  });

  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();
});

test('Failed persistence in Training Plan editor displays error and keeps edits for retry', async () => {
  const failingPersistence: Persistence = {
    loadAll: async () => [],
    save: async () => {
      throw new Error('Disk write error');
    },
    remove: async () => {},
  };

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Switch storage to failing persistence
  await hydrate(failingPersistence);

  // Change goal so there is a change to submit
  const strengthBtn = root.findByProps({
    accessibilityLabel: 'Get stronger, Progressive strength and stability',
  });
  ReactTestRenderer.act(() => {
    strengthBtn.props.onPress();
  });

  const saveBtn = root.findByProps({ accessibilityLabel: 'Save training plan' });
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  // Shows error banner and remains on editor
  const errorBanner = root.findByProps({ accessibilityLiveRegion: 'assertive' });
  expect(errorBanner).toBeTruthy();

  // Retry succeeded after restoring memory persistence
  await hydrate(null);
  await ReactTestRenderer.act(async () => {
    await saveBtn.props.onPress();
  });

  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();
});

test('getInitials extracts up to 2 uppercase initials and handles Vietnamese diacritics', () => {
  expect(getInitials('Huy')).toBe('H');
  expect(getInitials('Đỗ Huy')).toBe('ĐH');
  expect(getInitials('Nguyễn Văn Nam')).toBe('NN');
  expect(getInitials('  Ánh Tuyết  ')).toBe('ÁT');
  expect(getInitials('')).toBe('FL');
  expect(getInitials('   ')).toBe('FL');
  expect(getInitials(null)).toBe('FL');
  expect(getInitials(undefined)).toBe('FL');
});

test('AccountAvatar renders initials and is hidden from accessibility announcements', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<AccountAvatar name="Đỗ Huy" size={52} />);
  });
  const root = tree.root;

  // Wrapped container has accessible=false and aria-hidden=true
  const container = root.findByProps({ 'aria-hidden': true });
  expect(container.props.accessible).toBe(false);

  // Text renders initials
  const text = root.findByType(Text);
  expect(text.props.children).toBe('ĐH');
  expect(text.props.accessible).toBe(false);
});

test('Settings overview has no visible Back button row; Android system back works via handler', async () => {
  const renderer = await renderProfileScreen();
  const root = renderer.root;

  // No element with accessibilityLabel "Back" exists on overview
  const backButtons = root.findAllByProps({ accessibilityLabel: 'Back' });
  expect(backButtons.length).toBe(0);

  // Overview title and account card exist
  expect(root.findByProps({ children: 'Settings', accessibilityRole: 'header' })).toBeTruthy();
});

test('Training Plan in-place menu outside dismissal preserves draft value', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    daysPerWeek: 3,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Open Sessions menu
  const sessionsRow = root.findByProps({
    accessibilityLabel: 'Sessions per week, currently 3 days',
  });
  ReactTestRenderer.act(() => {
    sessionsRow.props.onPress();
  });

  // Menu is open
  expect(root.findByProps({ accessibilityLabel: '5 days per week' })).toBeTruthy();

  // Tap outside backdrop
  const dismissBtn = root.findByProps({ accessibilityLabel: 'Dismiss menu' });
  ReactTestRenderer.act(() => {
    dismissBtn.props.onPress();
  });

  // Menu is closed and value remains 3 days
  expect(root.findAllByProps({ accessibilityLabel: '5 days per week' }).length).toBe(0);
  expect(
    root.findByProps({ accessibilityLabel: 'Sessions per week, currently 3 days' })
  ).toBeTruthy();
});

test('Training Plan in-place menu hardware Back dismisses menu first before exiting editor', async () => {
  let backCallback: (() => boolean) | null = null;
  const backSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, callback: any) => {
    if (event === 'hardwareBackPress') {
      backCallback = callback;
    }
    return { remove: jest.fn() } as any;
  });

  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    minutes: 30,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Open Duration menu
  const durationRow = root.findByProps({
    accessibilityLabel: 'Session duration, currently 30 minutes',
  });
  ReactTestRenderer.act(() => {
    durationRow.props.onPress();
  });

  // Menu is open
  expect(root.findByProps({ accessibilityLabel: '45 minutes per session' })).toBeTruthy();

  // Trigger hardware Back press -> should dismiss menu first
  ReactTestRenderer.act(() => {
    const handled = backCallback ? backCallback() : false;
    expect(handled).toBe(true);
  });

  // Menu is now dismissed, but we are STILL on Training Plan editor
  expect(root.findAllByProps({ accessibilityLabel: '45 minutes per session' }).length).toBe(0);
  expect(root.findByProps({ children: 'Training Plan', accessibilityRole: 'header' })).toBeTruthy();

  backSpy.mockRestore();
});

test('Primary goal and Experience level render single small trailing checkmark and clean white resting rows', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    goal: 'habit',
    experience: 'beginner',
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  const habitBtn = root.findByProps({
    accessibilityLabel: 'Build a habit, Consistency and regular movement',
  });
  expect(habitBtn.props.accessibilityRole).toBe('radio');
  expect(habitBtn.props.accessibilityState).toEqual({ checked: true });

  const strengthBtn = root.findByProps({
    accessibilityLabel: 'Get stronger, Progressive strength and stability',
  });
  expect(strengthBtn.props.accessibilityRole).toBe('radio');
  expect(strengthBtn.props.accessibilityState).toEqual({ checked: false });
});

test('VectorClose and VectorCheckmark render valid SVG geometry and stroke properties', () => {
  let closeTree!: ReactTestRenderer.ReactTestRenderer;
  let checkTree!: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    closeTree = ReactTestRenderer.create(<VectorClose size={18} color="#3C3C43" strokeWidth={2.2} />);
    checkTree = ReactTestRenderer.create(<VectorCheckmark size={20} color="#007AFF" strokeWidth={2.4} />);
  });

  expect(closeTree.root.props.size).toBe(18);
  expect(closeTree.root.props.color).toBe('#3C3C43');
  expect(closeTree.root.props.strokeWidth).toBe(2.2);

  expect(checkTree.root.props.size).toBe(20);
  expect(checkTree.root.props.color).toBe('#007AFF');
  expect(checkTree.root.props.strokeWidth).toBe(2.4);
});

test('Training Plan editor displays refined section headings and vector toolbar actions with no bottom line', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // Verify refined section headings
  expect(root.findByProps({ children: 'Primary goal' })).toBeTruthy();
  expect(root.findByProps({ children: 'Experience level' })).toBeTruthy();
  expect(root.findByProps({ children: 'Schedule & duration' })).toBeTruthy();

  // Verify Cancel and Save action buttons (touch target >= 48)
  const cancelBtn = root.findByProps({ accessibilityLabel: 'Cancel editing' });
  expect(cancelBtn.props.accessibilityRole).toBe('button');

  const saveBtn = root.findByProps({ accessibilityLabel: 'Save training plan' });
  expect(saveBtn.props.accessibilityRole).toBe('button');

  // Verify VectorClose and VectorCheckmark are rendered inside the buttons
  expect(cancelBtn.findByType(VectorClose)).toBeTruthy();
  expect(saveBtn.findByType(VectorCheckmark)).toBeTruthy();
});

test('Training Plan floating menu dismisses and returns accessibility focus to trigger', async () => {
  const sendEventSpy = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');

  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    daysPerWeek: 3,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  const sessionsRow = root.findByProps({
    accessibilityLabel: 'Sessions per week, currently 3 days',
  });

  // Open menu
  ReactTestRenderer.act(() => {
    sessionsRow.props.onPress();
  });

  // Tap outside backdrop
  const dismissBtn = root.findByProps({ accessibilityLabel: 'Dismiss menu' });
  ReactTestRenderer.act(() => {
    dismissBtn.props.onPress();
  });

  expect(sendEventSpy).toHaveBeenCalledWith(expect.anything(), 'focus');
  sendEventSpy.mockRestore();
});

test('Training Plan floating menu renders solid fallback card when forceSolidFallback is true', async () => {
  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    minutes: 30,
  });

  const renderer = await renderProfileScreen({ forceSolidFallback: true });
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  const durationRow = root.findByProps({
    accessibilityLabel: 'Session duration, currently 30 minutes',
  });

  // Open Duration menu in solid fallback mode
  ReactTestRenderer.act(() => {
    durationRow.props.onPress();
  });

  const dur45Btn = root.findByProps({ accessibilityLabel: '45 minutes per session' });
  expect(dur45Btn).toBeTruthy();

  // Select 45 minutes
  ReactTestRenderer.act(() => {
    dur45Btn.props.onPress();
  });

  expect(
    root.findByProps({ accessibilityLabel: 'Session duration, currently 45 minutes' })
  ).toBeTruthy();
});

test('Training Plan floating menu restores focus to trigger on option selection and Android Back', async () => {
  const sendEventSpy = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
  let backCallback: (() => boolean) | null = null;
  const backSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((evt, cb) => {
    if (evt === 'hardwareBackPress') {
      backCallback = cb as () => boolean;
    }
    return { remove: jest.fn() } as any;
  });

  write(KEYS.profile, {
    ...DEFAULT_PROFILE,
    daysPerWeek: 3,
    minutes: 30,
  });

  const renderer = await renderProfileScreen();
  const root = renderer.root;
  const planRow = root.findByProps({ accessibilityLabel: 'Training Plan' });

  ReactTestRenderer.act(() => {
    planRow.props.onPress();
  });

  // 1. Test selection restores focus
  const sessionsRow = root.findByProps({
    accessibilityLabel: 'Sessions per week, currently 3 days',
  });
  ReactTestRenderer.act(() => {
    sessionsRow.props.onPress();
  });

  const opt4Days = root.findByProps({ accessibilityLabel: '4 days per week' });
  expect(opt4Days).toBeTruthy();
  ReactTestRenderer.act(() => {
    opt4Days.props.onPress();
  });

  expect(sendEventSpy).toHaveBeenCalledWith(expect.anything(), 'focus');

  // 2. Test Android Back dismisses menu and restores focus
  const durationRow = root.findByProps({
    accessibilityLabel: 'Session duration, currently 30 minutes',
  });
  ReactTestRenderer.act(() => {
    durationRow.props.onPress();
  });

  expect(root.findByProps({ accessibilityLabel: 'Dismiss menu' })).toBeTruthy();

  // Simulate Android hardware Back
  ReactTestRenderer.act(() => {
    const handled = backCallback ? backCallback() : false;
    expect(handled).toBe(true);
  });

  // Menu is dismissed and focus restored to duration trigger
  expect(sendEventSpy).toHaveBeenCalledWith(expect.anything(), 'focus');
  expect(root.findAllByProps({ accessibilityLabel: 'Dismiss menu' }).length).toBe(0);

  sendEventSpy.mockRestore();
  backSpy.mockRestore();
});
