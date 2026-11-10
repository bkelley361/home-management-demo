import AsyncStorage from '@react-native-async-storage/async-storage';

import { deviceCalendarProvider, type SyncableReminder } from '@/lib/calendar-sync';
import type { TablesUpdate } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { cancelReminderNotification, scheduleReminderNotification } from '@/lib/notifications';
import {
  computeReminderSuccessor,
  REMINDER_UNDO_WINDOW_MS,
  type CompletableReminder,
} from '@/lib/reminders';
import { generateUUID } from '@/lib/utils';

/**
 * The single entry point for mutating reminders.
 *
 * Every reminder change can affect its database row, a scheduled notification,
 * and a calendar event. Screens call these functions so each path keeps those
 * effects in sync.
 */

const CALENDAR_SYNC_KEY = 'settings.calendarSyncEnabled';
const NOTIFICATIONS_KEY = 'settings.notificationsEnabled';

export async function isCalendarSyncEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(CALENDAR_SYNC_KEY)) === 'true';
}

export async function setCalendarSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(CALENDAR_SYNC_KEY, enabled ? 'true' : 'false');
}

export async function areNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIFICATIONS_KEY)) === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
}

type ReminderRecord = CompletableReminder;

function toSyncable(reminder: ReminderRecord): SyncableReminder {
  return {
    id: reminder.id,
    title: reminder.title,
    due_date: reminder.due_date,
    recurrence_rule: reminder.recurrence_rule,
  };
}

async function updateReminder(
  reminder: ReminderRecord,
  changes: TablesUpdate<'reminders'>
): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update(changes)
    .eq('id', reminder.id)
    .eq('home_id', reminder.home_id);
  if (error) throw error;
}

/**
 * Attach a notification and (if enabled) a calendar event to a reminder.
 * Safe to call for a reminder that already has them — the old notification is cleared.
 */
export async function syncReminderSideEffects(reminder: ReminderRecord): Promise<void> {
  const updates: TablesUpdate<'reminders'> = {};

  // Notification: always reschedule from scratch.
  if (reminder.notification_id) {
    await cancelReminderNotification(reminder.notification_id);
    updates.notification_id = null;
  }
  const notificationId = await scheduleReminderNotification(reminder);
  if (notificationId) updates.notification_id = notificationId;

  // Calendar: create or update depending on whether we already have an event.
  if (await isCalendarSyncEnabled()) {
    if (reminder.calendar_event_id) {
      await deviceCalendarProvider.updateEvent(reminder.calendar_event_id, toSyncable(reminder));
    } else {
      const eventId = await deviceCalendarProvider.createEvent(toSyncable(reminder));
      if (eventId) updates.calendar_event_id = eventId;
    }
  }

  if (Object.keys(updates).length > 0) await updateReminder(reminder, updates);
}

/** Remove a reminder's notification and calendar event. */
async function clearSideEffects(reminder: ReminderRecord): Promise<void> {
  if (reminder.notification_id) {
    await cancelReminderNotification(reminder.notification_id);
  }
  if (reminder.calendar_event_id) {
    await deviceCalendarProvider.deleteEvent(reminder.calendar_event_id);
  }
}

export type CompleteOptions = {
  /** Odometer reading, for mileage-based vehicle reminders. */
  currentMileage?: number;
};

export async function completeReminder(
  reminder: ReminderRecord,
  options: CompleteOptions = {}
): Promise<void> {
  const next = computeReminderSuccessor(reminder, options);
  const nextReminderId = next.dueDate === null ? null : generateUUID();
  const completedAt = Date.now();

  // Clear local identifiers before committing, keeping the existing side-effect order.
  await clearSideEffects(reminder);
  await updateReminder(reminder, { notification_id: null, calendar_event_id: null });
  const { error } = await supabase.rpc('complete_reminder', {
    p_reminder_id: reminder.id,
    p_completed_at: completedAt,
    p_undo_expires_at: completedAt + REMINDER_UNDO_WINDOW_MS,
    ...(reminder.asset?.asset_type === 'vehicle' &&
    options.currentMileage !== undefined &&
    options.currentMileage > 0
      ? { p_current_mileage: options.currentMileage }
      : {}),
    ...(nextReminderId && next.dueDate !== null
      ? {
          p_next_reminder_id: nextReminderId,
          p_next_due_date: next.dueDate,
          ...(next.dueMileage !== null && next.dueMileage !== undefined
            ? { p_next_due_mileage: next.dueMileage }
            : {}),
        }
      : {}),
  });
  if (error) throw error;

  // Give the newly spawned occurrence its own notification and event.
  if (nextReminderId && next.dueDate !== null) {
    await syncReminderSideEffects({
      ...reminder,
      id: nextReminderId,
      due_date: next.dueDate,
      due_mileage: next.dueMileage ?? null,
      next_reminder_id: null,
      notification_id: null,
      calendar_event_id: null,
    });
  }
}

export async function undoCompleteReminder(reminder: ReminderRecord): Promise<void> {
  await updateReminder(reminder, {
    status: 'upcoming',
    completed_at: null,
    undo_expires_at: null,
  });
  await syncReminderSideEffects({ ...reminder, notification_id: null, calendar_event_id: null });
}

export async function snoozeReminder(reminder: ReminderRecord, until: number): Promise<void> {
  await clearSideEffects(reminder);
  await updateReminder(reminder, {
    status: 'snoozed',
    snoozed_until: until,
    notification_id: null,
    calendar_event_id: null,
  });

  // Re-notify at the snooze date rather than the original due date.
  await syncReminderSideEffects({
    ...reminder,
    due_date: until,
    notification_id: null,
    calendar_event_id: null,
  });
}

export async function unsnoozeReminder(reminder: ReminderRecord): Promise<void> {
  await updateReminder(reminder, {
    status: 'upcoming',
    snoozed_until: null,
    notification_id: null,
    calendar_event_id: null,
  });
  await syncReminderSideEffects({ ...reminder, notification_id: null, calendar_event_id: null });
}

/** Change a reminder's due date or recurrence, keeping side effects aligned. */
export async function updateReminderSchedule(
  reminder: ReminderRecord,
  changes: { due_date?: number; recurrence_rule?: string; title?: string }
): Promise<void> {
  await updateReminder(reminder, changes);
  await syncReminderSideEffects({ ...reminder, ...changes });
}

export async function deleteReminder(reminder: ReminderRecord): Promise<void> {
  await clearSideEffects(reminder);
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminder.id)
    .eq('home_id', reminder.home_id);
  if (error) throw error;
}

/** Add a calendar event for a single reminder, on demand. */
export async function addReminderToCalendar(reminder: ReminderRecord): Promise<boolean> {
  const granted = await deviceCalendarProvider.requestAccess();
  if (!granted) return false;

  if (reminder.calendar_event_id) {
    await deviceCalendarProvider.updateEvent(reminder.calendar_event_id, toSyncable(reminder));
    return true;
  }

  const eventId = await deviceCalendarProvider.createEvent(toSyncable(reminder));
  if (!eventId) return false;

  await updateReminder(reminder, { calendar_event_id: eventId });
  return true;
}

export async function removeReminderFromCalendar(reminder: ReminderRecord): Promise<void> {
  if (!reminder.calendar_event_id) return;
  await deviceCalendarProvider.deleteEvent(reminder.calendar_event_id);
  await updateReminder(reminder, { calendar_event_id: null });
}

/** Push every upcoming reminder to the calendar — used when enabling sync. */
export async function backfillCalendar(reminders: ReminderRecord[]): Promise<number> {
  let synced = 0;
  for (const reminder of reminders) {
    if (reminder.calendar_event_id) continue;
    const eventId = await deviceCalendarProvider.createEvent(toSyncable(reminder));
    if (eventId) {
      await updateReminder(reminder, { calendar_event_id: eventId });
      synced += 1;
    }
  }
  return synced;
}

/** Remove every calendar event we created — used when disabling sync. */
export async function clearCalendarEvents(reminders: ReminderRecord[]): Promise<void> {
  for (const reminder of reminders) {
    if (!reminder.calendar_event_id) continue;
    await deviceCalendarProvider.deleteEvent(reminder.calendar_event_id);
    await updateReminder(reminder, { calendar_event_id: null });
  }
}
