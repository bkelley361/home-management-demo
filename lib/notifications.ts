import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local scheduled notifications for reminders.
 *
 * These are on-device only — no push server, no tokens. A reminder due on a
 * given date gets one notification at 9am local that morning.
 */

const CHANNEL_ID = 'reminders';
const NOTIFY_HOUR = 9;

export type NotifiableReminder = {
  id: string;
  title: string;
  due_date: number;
};

/** Call once at app start, before any scheduling. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android requires an explicit channel before notifications will display. */
export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Maintenance reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#00668c',
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** 9am local on the due date. */
function notifyDate(dueDate: number): Date {
  const date = new Date(dueDate);
  date.setHours(NOTIFY_HOUR, 0, 0, 0);
  return date;
}

/**
 * Schedule a notification for a reminder.
 *
 * Returns the notification id to persist on the reminder, or null when the due
 * date is already past (nothing to schedule) or permission is missing.
 */
export async function scheduleReminderNotification(
  reminder: NotifiableReminder
): Promise<string | null> {
  if (!(await hasNotificationPermission())) return null;

  const date = notifyDate(reminder.due_date);
  if (date.getTime() <= Date.now()) return null;

  await ensureNotificationChannel();

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: 'Due today.',
        data: { reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelReminderNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or cancelled — nothing to do.
  }
}

export async function cancelAllReminderNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled.
  }
}
