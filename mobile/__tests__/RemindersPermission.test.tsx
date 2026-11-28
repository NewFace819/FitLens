/**
 * #31: Reminders tells the user when Android has notifications off for FitLens
 * (refused at onboarding or later), instead of looking switched on.
 */
import React from 'react';
import { AppState, Linking } from 'react-native';
import Renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import RemindersScreen from '../src/screens/reminders';
import { setNotificationScheduler, type NotificationScheduler } from '../src/modules/reminders/notifications';
import { setReminder } from '../src/modules/reminders/reminders';
import { hydrate } from '../src/shared/storage';

jest.mock('../src/navigation', () => ({ useAppNavigation: () => ({ navigate: jest.fn() }), goBackOrHome: jest.fn() }));
jest.mock('../src/ui/components', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Button: ({ title, ...props }: any) => <Pressable {...props}><Text>{title}</Text></Pressable>,
    Chip: ({ label, ...props }: any) => <Pressable {...props}><Text>{label}</Text></Pressable>,
    IconButton: ({ children, ...props }: any) => <Pressable {...props}>{children}</Pressable>,
    Sheet: ({ visible, children }: any) => (visible ? <View>{children}</View> : null),
  };
});

let allowed = false;
const scheduler: NotificationScheduler = {
  ensurePermission: jest.fn(async () => allowed),
  cancelAll: jest.fn(async () => {}),
  schedule: jest.fn(async () => {}),
};

let app: ReactTestRenderer;
let appStateListener: ((s: string) => void) | undefined;
beforeEach(async () => {
  jest.clearAllMocks();
  await hydrate(null);
  // The user has reminders on in FitLens (the built-in default is off).
  setReminder(null, { enabled: true, minutesBefore: 15 });
  setNotificationScheduler(scheduler);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
    appStateListener = cb;
    return { remove: jest.fn() };
  }) as any);
});
afterEach(async () => {
  await act(async () => app?.unmount());
  setNotificationScheduler(null);
  jest.restoreAllMocks();
});

const banner = () => app.root.findAll((n) => n.props.testID === 'notifications-off' && typeof n.type === 'string');
const mount = async () => { await act(async () => { app = Renderer.create(<RemindersScreen />); }); };

test('permission refused → a clear notice with a way to Android settings, and no prompt', async () => {
  allowed = false;
  await mount();
  expect(banner()).toHaveLength(1);
  expect(JSON.stringify(app.toJSON())).toContain('Notifications are off for FitLens');
  expect(scheduler.ensurePermission).toHaveBeenCalledWith(false);
  expect(scheduler.ensurePermission).not.toHaveBeenCalledWith(true);

  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
  const button = app.root.findAll((n) => n.props.title === 'Open Android settings' && typeof n.props.onPress === 'function')[0];
  await act(async () => { button.props.onPress(); });
  expect(open).toHaveBeenCalledTimes(1);
});

test('coming back from settings with notifications allowed hides the notice', async () => {
  allowed = false;
  await mount();
  expect(banner()).toHaveLength(1);
  allowed = true;
  await act(async () => { appStateListener?.('active'); });
  expect(banner()).toHaveLength(0);
});

test('permission allowed → no notice', async () => {
  allowed = true;
  await mount();
  expect(banner()).toHaveLength(0);
});

test('reminders turned off → no notice even when permission is refused', async () => {
  allowed = false;
  setReminder(null, { enabled: false, minutesBefore: 15 });
  await mount();
  expect(banner()).toHaveLength(0);
});

test('preview mode (no notification library) → no notice', async () => {
  setNotificationScheduler(null);
  await mount();
  expect(banner()).toHaveLength(0);
});
