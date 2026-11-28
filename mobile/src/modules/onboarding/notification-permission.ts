/**
 * Notification permission adapter for onboarding — OWNER: Tu (reminders / notification scheduler).
 *
 * This adapter is private to the onboarding introduction flow until Tu selects
 * and integrates the native notification library for reminder scheduling.
 * It uses React Native's built-in PermissionsAndroid and Linking APIs without adding
 * external dependencies.
 *
 * Android behavior reference:
 * https://developer.android.com/develop/ui/views/notifications/notification-permission
 *
 * - API 33+ (Tiramisu / Android 13+): Uses runtime POST_NOTIFICATIONS permission.
 * - API < 33: No runtime POST_NOTIFICATIONS dialog exists in the OS.
 */
import { Linking, PermissionsAndroid, Platform } from 'react-native';

export type NotificationPermissionStatus =
  | 'idle'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unsupported'
  | 'request-error';

export interface NotificationPermissionAdapter {
  /** Whether the OS version supports runtime permission requests (API 33+). */
  canRequestRuntimePermission(): boolean;
  /** Checks current OS notification permission status without prompting. */
  checkPermission(): Promise<NotificationPermissionStatus>;
  /** Requests runtime notification permission on API 33+. */
  requestPermission(): Promise<NotificationPermissionStatus>;
  /** Opens application notification settings in Android OS. */
  openSettings(): Promise<boolean>;
}

const POST_NOTIFICATIONS =
  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS ??
  ('android.permission.POST_NOTIFICATIONS' as const);

export const nativeNotificationPermissionAdapter: NotificationPermissionAdapter = {
  canRequestRuntimePermission(): boolean {
    if (Platform.OS === 'android') {
      return Number(Platform.Version) >= 33;
    }
    return true;
  },

  async checkPermission(): Promise<NotificationPermissionStatus> {
    if (Platform.OS !== 'android') {
      return 'denied';
    }
    if (Number(Platform.Version) < 33) {
      return 'unsupported';
    }
    try {
      const granted = await PermissionsAndroid.check(POST_NOTIFICATIONS);
      return granted ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  },

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (Platform.OS === 'android' && Number(Platform.Version) < 33) {
      return 'unsupported';
    }
    try {
      const result = await PermissionsAndroid.request(POST_NOTIFICATIONS);
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      }
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }
      return 'denied';
    } catch {
      throw new Error('Notification permission request failed');
    }
  },

  async openSettings(): Promise<boolean> {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  },
};
