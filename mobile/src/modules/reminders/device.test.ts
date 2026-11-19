import { hydrate } from '../../shared/storage';
import { resetSampleData } from '../../shared/seed';
import { markSessionDone, updateSession } from '../workouts/schedule';
import { startDeviceReminders } from './device';
import type { NotificationScheduler } from './notifications';
import type { ScheduledNotification } from './reminder-model';
import { pendingNotifications, setReminder } from './reminders';

/** Fake phone: keeps what is currently scheduled, like Android's alarm list. */
function fakePhone() {
  const scheduled = new Map<string, ScheduledNotification>();
  const scheduler: NotificationScheduler = {
    ensurePermission: async () => true,
    cancelAll: async () => scheduled.clear(),
    schedule: async (n) => {
      scheduled.set(n.sessionId, n);
    },
  };
  return { scheduler, scheduled };
}
const settle = () => new Promise<void>((r) => setTimeout(r, 20));

let stop: () => void = () => {};
beforeEach(async () => {
  await hydrate(null);
  resetSampleData(new Date());
});
afterEach(() => stop());

test('moving a session re-schedules its reminder at the new time', async () => {
  const phone = fakePhone();
  stop = startDeviceReminders(phone.scheduler, 0);
  setReminder(null, { enabled: true, minutesBefore: 15 });
  await settle();
  const first = pendingNotifications()[0];
  expect(phone.scheduled.get(first.sessionId)?.at.getTime()).toBe(first.at.getTime());

  expect(updateSession(first.sessionId, { time: '20:30' }).ok).toBe(true);
  await settle();
  const moved = phone.scheduled.get(first.sessionId)!;
  expect(moved.at.getHours() * 60 + moved.at.getMinutes()).toBe(20 * 60 + 15);
});

test('a session marked done early is no longer reminded', async () => {
  const phone = fakePhone();
  stop = startDeviceReminders(phone.scheduler, 0);
  setReminder(null, { enabled: true, minutesBefore: 15 });
  await settle();
  const id = pendingNotifications()[0].sessionId;
  expect(phone.scheduled.has(id)).toBe(true);

  markSessionDone(id);
  await settle();
  expect(phone.scheduled.has(id)).toBe(false);
});

test('turning reminders off clears the phone', async () => {
  const phone = fakePhone();
  stop = startDeviceReminders(phone.scheduler, 0);
  setReminder(null, { enabled: true, minutesBefore: 15 });
  await settle();
  expect(phone.scheduled.size).toBeGreaterThan(0);

  setReminder(null, { enabled: false, minutesBefore: 15 });
  await settle();
  expect(phone.scheduled.size).toBe(0);
});

test('after stop, changes no longer touch the phone', async () => {
  const phone = fakePhone();
  startDeviceReminders(phone.scheduler, 0)();
  setReminder(null, { enabled: true, minutesBefore: 15 });
  await settle();
  expect(phone.scheduled.size).toBe(0);
});
