/**
 * Keeps the phone's reminders in step with the schedule. OWNER: Tu.
 *
 * Alarms already handed to Android fire even if nobody reads our data again,
 * so "check when reading" (DATA_CONTRACT §5) is not enough. Instead we listen
 * to shared storage: whenever what *should* be scheduled changes — Hải moves or
 * deletes a session, Đức Huy marks one done, the user edits a reminder — we
 * re-sync. Other modules don't need to call anything.
 */
import { subscribe } from '../../shared/storage';
import { setNotificationScheduler, syncReminderNotifications, type NotificationScheduler } from './notifications';
import { pendingNotifications } from './reminders';

let stop: (() => void) | null = null;

const signature = () =>
  JSON.stringify(pendingNotifications().map((n) => [n.sessionId, n.at.getTime(), n.title]));

/** Plug in the device scheduler and re-sync on every relevant data change. Idempotent. */
export function startDeviceReminders(scheduler: NotificationScheduler, debounceMs = 400): () => void {
  stop?.();
  setNotificationScheduler(scheduler);
  let last: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const next = signature();
      if (next === last) return;
      last = next;
      syncReminderNotifications().catch(() => {
        last = null; // try again on the next change
      });
    }, debounceMs);
  });

  stop = () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
    setNotificationScheduler(null);
    stop = null;
  };
  return stop;
}
