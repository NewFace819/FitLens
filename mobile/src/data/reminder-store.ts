import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WEEKDAY_LONG } from '../domain/dates.ts';
import {
  normalizeReminders,
  notificationTime,
  toExpoWeekday,
  type WeekReminders,
} from '../domain/reminders.ts';
import { KEYS, readJson, writeJson } from './storage';

const CHANNEL_ID = 'workout-reminders';

export const loadReminders = () => readJson(KEYS.reminders, normalizeReminders);

/** Call once at app start so reminders show while the app is open too. */
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

/** Android 13+: the channel must exist before the permission prompt appears. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Saves reminders and re-schedules this app's weekly notifications.
 * Returns how many notifications are now scheduled, or `null` when the user
 * has not allowed notifications (times are still saved).
 */
export async function saveReminders(items: WeekReminders): Promise<number | null> {
  const clean = normalizeReminders(items);
  await writeJson(KEYS.reminders, clean);

  const previous = await readJson(KEYS.reminderIds, (raw) => (Array.isArray(raw) ? (raw as string[]) : []));
  await Promise.all(previous.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await writeJson(KEYS.reminderIds, []);

  const active = clean.map((item, day) => ({ item, day })).filter(({ item }) => item?.enabled);
  if (!active.length) return 0;
  if (!(await ensurePermission())) return null;

  const ids: string[] = [];
  for (const { item, day } of active) {
    if (!item) continue;
    const when = notificationTime(day, item);
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.before ? `Workout in ${item.before} minutes` : 'Time for your workout',
          body: `${WEEKDAY_LONG[day]} · ${item.time}. A little movement goes a long way.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(when.day),
          hour: when.hour,
          minute: when.minute,
          channelId: CHANNEL_ID,
        },
      }),
    );
  }
  await writeJson(KEYS.reminderIds, ids);
  return ids.length;
}
