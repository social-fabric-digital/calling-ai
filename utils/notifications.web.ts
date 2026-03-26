/**
 * Web / SSR: avoid importing `expo-notifications` (it touches `localStorage` during
 * static export and breaks `eas update` / `expo export --platform=all`).
 * Native apps use `notifications.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_ENABLED_KEY = '@notification_enabled';
const NOTIFICATION_HOUR_KEY = '@notification_hour';
const NOTIFICATION_MINUTE_KEY = '@notification_minute';

export interface NotificationPreferences {
  enabled: boolean;
  hour: number;
  minute: number;
}

type SupportedLanguage = 'en' | 'ru';

type GoalInput =
  | string
  | {
      name?: string;
      title?: string;
      isActive?: boolean;
    };

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function saveNotificationPreferences(
  enabled: boolean,
  hour: number,
  minute: number,
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled));
  await AsyncStorage.setItem(NOTIFICATION_HOUR_KEY, JSON.stringify(hour));
  await AsyncStorage.setItem(NOTIFICATION_MINUTE_KEY, JSON.stringify(minute));
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    const hour = await AsyncStorage.getItem(NOTIFICATION_HOUR_KEY);
    const minute = await AsyncStorage.getItem(NOTIFICATION_MINUTE_KEY);
    return {
      enabled: enabled ? JSON.parse(enabled) : false,
      hour: hour ? JSON.parse(hour) : 9,
      minute: minute ? JSON.parse(minute) : 0,
    };
  } catch {
    return { enabled: false, hour: 9, minute: 0 };
  }
}

export async function scheduleDailyNotification(
  _hour: number,
  _minute: number,
  _name?: string,
  _goals: GoalInput[] = [],
  _language?: SupportedLanguage,
): Promise<void> {
  // No local notifications on web export / browser.
}

export async function syncNotificationScheduleWithPreferences(): Promise<void> {
  // No-op on web.
}

export async function cancelAllNotifications(): Promise<void> {
  // No-op on web.
}
