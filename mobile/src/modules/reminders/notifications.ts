/**
 * Device notifications for reminders. OWNER: Tu.
 *
 * Mirrors pendingNotifications() onto the phone: cancel ours, schedule again.
 * Call after any change to reminders or session times, and on app start.
 *
 * The native notification library is NOT chosen yet (needs an Android build
 * to verify, see docs/design/RHYTHM_CHECKIN_REMINDER.md). Until a scheduler is
 * plugged in with setNotificationScheduler(), this runs in "preview" mode:
 * it computes exactly what would be sent but sends nothing — the same
 * behaviour as the HTML prototype.
 */
import { pendingNotifications } from './reminders';
import type { ScheduledNotification } from './reminder-model';

export type NotificationScheduler = {
  /** Ask (if `ask`) and report whether notifications are allowed. */
  ensurePermission(ask: boolean): Promise<boolean>;
  /** Cancel every notification this app scheduled. */
  cancelAll(): Promise<void>;
  schedule(n: ScheduledNotification): Promise<void>;
};

let scheduler: NotificationScheduler | null = null;

export function setNotificationScheduler(s: NotificationScheduler | null) {
  scheduler = s;
}

export type SyncResult =
  | { mode: 'device'; scheduled: number }
  | { mode: 'denied'; pending: number }
  | { mode: 'preview'; pending: number };

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs one sync at a time: a sync started by an older change can never
 * re-schedule a reminder that a newer sync has already cancelled.
 */
export function syncReminderNotifications(options: { ask?: boolean } = {}, now?: Date): Promise<SyncResult> {
  const run = queue.then(() => syncNow(options, now ?? new Date()));
  queue = run.catch(() => undefined);
  return run;
}

async function syncNow(options: { ask?: boolean }, now: Date): Promise<SyncResult> {
  const plan = pendingNotifications(now);
  if (!scheduler) return { mode: 'preview', pending: plan.length };
  if (!(await scheduler.ensurePermission(options.ask === true && plan.length > 0))) {
    return plan.length ? { mode: 'denied', pending: plan.length } : { mode: 'device', scheduled: 0 };
  }
  await scheduler.cancelAll();
  for (const n of plan) await scheduler.schedule(n);
  return { mode: 'device', scheduled: plan.length };
}

/**
 * Whether the phone currently allows FitLens notifications. Never prompts.
 * null = unknown: no scheduler plugged in (preview mode, tests) or the check failed.
 */
export async function notificationsAllowed(): Promise<boolean | null> {
  if (!scheduler) return null;
  try {
    return await scheduler.ensurePermission(false);
  } catch {
    return null;
  }
}

/**
 * Dev only: schedule one reminder `seconds` from now so the device path can be
 * checked without waiting for a real session. A later sync cancels it.
 */
export async function sendTestReminder(seconds = 60, now: Date = new Date()): Promise<string> {
  if (!scheduler) return 'Preview mode: no notification library plugged in.';
  if (!(await scheduler.ensurePermission(true))) return 'Notifications are off for FitLens — turn them on in Android settings.';
  await scheduler.schedule({
    sessionId: 'dev-test',
    at: new Date(now.getTime() + seconds * 1000),
    title: 'Test reminder',
    body: 'If you can read this, FitLens reminders work on this phone.',
  });
  return `Test reminder scheduled in ${seconds} seconds. You can leave the app.`;
}

export function describeSync(r: SyncResult): string {
  switch (r.mode) {
    case 'preview':
      return r.pending
        ? `Saved. Preview only — ${r.pending} ${r.pending === 1 ? 'reminder' : 'reminders'} would be sent in the next two weeks.`
        : 'Saved. No reminders planned.';
    case 'denied':
      return 'Saved. Notifications are off for FitLens — turn them on in Android settings to get reminders.';
    default:
      return r.scheduled ? `Saved. ${r.scheduled} ${r.scheduled === 1 ? 'reminder' : 'reminders'} scheduled for the next two weeks.` : 'Saved. No reminders scheduled.';
  }
}
