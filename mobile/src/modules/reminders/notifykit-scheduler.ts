/**
 * NotificationScheduler backed by react-native-notify-kit (maintained Notifee fork).
 * OWNER: Tu. Plugged in once at start-up with setNotificationScheduler().
 *
 * - One Android channel, "Workout reminders".
 * - Inexact AlarmManager trigger that still fires in Doze (SET_AND_ALLOW_WHILE_IDLE):
 *   a reminder a few minutes late is fine, and it needs no SCHEDULE_EXACT_ALARM
 *   permission (denied by default on Android 14+).
 * - Notification id = `fitlens-rem-<sessionId>`, so re-scheduling replaces, never duplicates.
 * - cancelAll() only cancels *trigger* notifications (ours), not ones already shown.
 */
import notifee, { AlarmType, AndroidImportance, AuthorizationStatus, TriggerType } from 'react-native-notify-kit';
import type { NotificationScheduler } from './notifications';
import type { ScheduledNotification } from './reminder-model';

export const REMINDER_CHANNEL_ID = 'fitlens-reminders';
export const notificationId = (sessionId: string) => `fitlens-rem-${sessionId}`;

let channelReady: Promise<string> | null = null;
const ensureChannel = () =>
  (channelReady ??= notifee.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Workout reminders',
    description: 'A nudge before your planned workouts.',
    importance: AndroidImportance.DEFAULT,
  }));

const allowed = (status: AuthorizationStatus) =>
  status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;

export const notifyKitScheduler: NotificationScheduler = {
  async ensurePermission(ask) {
    const current = await notifee.getNotificationSettings();
    if (allowed(current.authorizationStatus)) return true;
    if (!ask) return false;
    return allowed((await notifee.requestPermission()).authorizationStatus);
  },

  async cancelAll() {
    await notifee.cancelTriggerNotifications();
  },

  async schedule(n: ScheduledNotification) {
    const channelId = await ensureChannel();
    await notifee.createTriggerNotification(
      {
        id: notificationId(n.sessionId),
        title: n.title,
        body: n.body,
        data: { sessionId: n.sessionId },
        android: { channelId, smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: n.at.getTime(),
        alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
      },
    );
  },
};

/** Test-only: forget the cached channel promise. */
export function __resetForTests() {
  channelReady = null;
}
