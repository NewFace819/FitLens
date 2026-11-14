/**
 * Device notifications for reminders (expo-notifications). OWNER: Tu.
 * Mirrors pendingNotifications() onto the phone: cancel ours, schedule again.
 * Call after any change to reminders or session times, and on app start.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pendingNotifications } from './reminders.ts';

const CHANNEL_ID = 'workout-reminders';

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android 13+: create the channel before asking, or the prompt won't show. */
export async function ensurePermission(ask: boolean): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Returns how many notifications are scheduled, or null when notifications
 * aren't allowed (reminders are still saved).
 */
export async function syncReminderNotifications(options: { ask?: boolean } = {}): Promise<number | null> {
  const plan = pendingNotifications(new Date());
  if (!(await ensurePermission(options.ask === true && plan.length > 0))) return plan.length ? null : 0;
  // FitLens schedules no other local notifications, so clearing all is safe.
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { session: n.sessionId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL_ID },
    });
  }
  return plan.length;
}
