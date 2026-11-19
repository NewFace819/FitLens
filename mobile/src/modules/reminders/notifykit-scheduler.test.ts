import notifee from 'react-native-notify-kit';
import { notificationId, notifyKitScheduler, REMINDER_CHANNEL_ID, __resetForTests } from './notifykit-scheduler';
import { setNotificationScheduler, syncReminderNotifications } from './notifications';
import { hydrate } from '../../shared/storage';
import { resetSampleData } from '../../shared/seed';

jest.mock('react-native-notify-kit', () => {
  const api = {
    getNotificationSettings: jest.fn(),
    requestPermission: jest.fn(),
    createChannel: jest.fn(async (c: { id: string }) => c.id),
    cancelTriggerNotifications: jest.fn(async () => {}),
    createTriggerNotification: jest.fn(async () => 'id'),
  };
  return {
    __esModule: true,
    default: api,
    AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
    AndroidImportance: { DEFAULT: 3 },
    TriggerType: { TIMESTAMP: 0 },
    AlarmType: { SET_AND_ALLOW_WHILE_IDLE: 1 },
  };
});

const api = notifee as unknown as Record<string, jest.Mock>;
const status = (authorizationStatus: number) => ({ authorizationStatus });

beforeEach(() => {
  jest.clearAllMocks();
  __resetForTests();
});

test('permission: already allowed → no prompt', async () => {
  api.getNotificationSettings.mockResolvedValue(status(1));
  expect(await notifyKitScheduler.ensurePermission(true)).toBe(true);
  expect(api.requestPermission).not.toHaveBeenCalled();
});

test('permission: not allowed and ask=false → false, never prompts', async () => {
  api.getNotificationSettings.mockResolvedValue(status(-1));
  expect(await notifyKitScheduler.ensurePermission(false)).toBe(false);
  expect(api.requestPermission).not.toHaveBeenCalled();
});

test('permission: ask=true prompts and reports the answer', async () => {
  api.getNotificationSettings.mockResolvedValue(status(-1));
  api.requestPermission.mockResolvedValue(status(0));
  expect(await notifyKitScheduler.ensurePermission(true)).toBe(false);
  api.requestPermission.mockResolvedValue(status(1));
  expect(await notifyKitScheduler.ensurePermission(true)).toBe(true);
});

test('schedule: stable id per session, timestamp trigger, channel created once', async () => {
  const at = new Date(2026, 10, 20, 17, 30);
  await notifyKitScheduler.schedule({ sessionId: 'ss-1', at, title: 'Upper body in 30 minutes', body: 'b' });
  await notifyKitScheduler.schedule({ sessionId: 'ss-2', at, title: 't', body: 'b' });
  expect(api.createChannel).toHaveBeenCalledTimes(1);
  const [notification, trigger] = api.createTriggerNotification.mock.calls[0];
  expect(notification.id).toBe(notificationId('ss-1'));
  expect(notification.android.channelId).toBe(REMINDER_CHANNEL_ID);
  expect(notification.data).toEqual({ sessionId: 'ss-1' });
  expect(trigger).toEqual({ type: 0, timestamp: at.getTime(), alarmManager: { type: 1 } });
});

test('syncReminderNotifications with the real adapter: cancel, then one trigger per pending reminder', async () => {
  const now = new Date(2026, 10, 12, 10, 0);
  await hydrate(null);
  resetSampleData(now);
  api.getNotificationSettings.mockResolvedValue(status(1));
  setNotificationScheduler(notifyKitScheduler);
  try {
    const r = await syncReminderNotifications({}, now);
    expect(r.mode).toBe('device');
    expect(api.cancelTriggerNotifications).toHaveBeenCalledTimes(1);
    expect(api.createTriggerNotification).toHaveBeenCalledTimes(r.mode === 'device' ? r.scheduled : -1);
  } finally {
    setNotificationScheduler(null);
  }
});
