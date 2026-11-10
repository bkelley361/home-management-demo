import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import { parseRule } from '@/lib/recurrence';

/**
 * Device-calendar sync for reminders.
 *
 * Writing to the device calendar is what makes "add to Google Calendar" work:
 * if the user's Google account is on the device, the OS syncs the event up
 * automatically. That avoids a separate OAuth consent flow and a backend to
 * hold refresh tokens.
 *
 * Everything goes through the `CalendarProvider` shape so a real Google
 * Calendar API implementation can be dropped in later without touching screens.
 */

export type SyncableReminder = {
  id: string;
  title: string;
  due_date: number;
  recurrence_rule: string;
  notes?: string;
};

export type TargetCalendar = {
  id: string;
  title: string;
  /** Human-readable account/source, e.g. "you@gmail.com". */
  source: string;
  /** True when the OS will sync this calendar to a Google account. */
  isGoogle: boolean;
};

export type CalendarProvider = {
  isAvailable(): Promise<boolean>;
  requestAccess(): Promise<boolean>;
  getTargetCalendar(): Promise<TargetCalendar | null>;
  createEvent(reminder: SyncableReminder): Promise<string | null>;
  updateEvent(eventId: string, reminder: SyncableReminder): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
};

/**
 * SDK 56 doesn't re-export the `Calendar` entity type from the package index,
 * so derive it from what `getCalendarsAsync` actually returns.
 */
type DeviceCalendar = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];

const LOCAL_CALENDAR_TITLE = 'Home Management';
/** All-day-ish default: events land at 9am local on the due date. */
const EVENT_HOUR = 9;

function looksGoogle(calendar: DeviceCalendar): boolean {
  const source = calendar.source;
  const haystack = `${source?.name ?? ''} ${calendar.title ?? ''}`.toLowerCase();
  if (haystack.includes('gmail') || haystack.includes('google')) return true;
  // Android reports the account type directly.
  return (source as any)?.type === 'com.google';
}

function isWritable(calendar: DeviceCalendar): boolean {
  if (!calendar.allowsModifications) return false;
  if (calendar.accessLevel) {
    return (
      calendar.accessLevel === Calendar.CalendarAccessLevel.OWNER ||
      calendar.accessLevel === Calendar.CalendarAccessLevel.EDITOR ||
      calendar.accessLevel === Calendar.CalendarAccessLevel.CONTRIBUTOR
    );
  }
  return true;
}

/** Map a canonical recurrence rule onto expo-calendar's RecurrenceRule. */
function toRecurrenceRule(rule: string): Calendar.RecurrenceRule | undefined {
  const parsed = parseRule(rule);

  switch (parsed.kind) {
    case 'none':
      return undefined;
    case 'interval': {
      const frequency =
        parsed.unit === 'days'
          ? Calendar.Frequency.DAILY
          : parsed.unit === 'weeks'
            ? Calendar.Frequency.WEEKLY
            : parsed.unit === 'months'
              ? Calendar.Frequency.MONTHLY
              : Calendar.Frequency.YEARLY;
      return { frequency, interval: parsed.count };
    }
    case 'seasonal':
      return { frequency: Calendar.Frequency.YEARLY, interval: 1 };
    case 'mileage':
      // Mileage has no calendar analogue — write a single occurrence and let
      // completion create the next one.
      return undefined;
  }
}

function eventDates(dueDate: number) {
  const start = new Date(dueDate);
  start.setHours(EVENT_HOUR, 0, 0, 0);
  const end = new Date(start);
  end.setHours(EVENT_HOUR + 1, 0, 0, 0);
  return { start, end };
}

async function ensureLocalCalendar(): Promise<TargetCalendar | null> {
  const existing = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const found = existing.find((c) => c.title === LOCAL_CALENDAR_TITLE);
  if (found) {
    return { id: found.id, title: found.title, source: 'On this device', isGoogle: false };
  }

  try {
    let source: { isLocalAccount?: boolean; name: string; type: string } | undefined;
    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      source = defaultCalendar?.source as any;
    } else {
      source = { isLocalAccount: true, name: LOCAL_CALENDAR_TITLE, type: '' };
    }

    const id = await Calendar.createCalendarAsync({
      title: LOCAL_CALENDAR_TITLE,
      color: '#00668c',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: Platform.OS === 'ios' ? (source as any)?.id : undefined,
      source: Platform.OS === 'android' ? (source as any) : undefined,
      name: LOCAL_CALENDAR_TITLE,
      ownerAccount: LOCAL_CALENDAR_TITLE,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return { id, title: LOCAL_CALENDAR_TITLE, source: 'On this device', isGoogle: false };
  } catch {
    return null;
  }
}

export const deviceCalendarProvider: CalendarProvider = {
  async isAvailable() {
    try {
      return await Calendar.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async requestAccess() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Prefer a writable Google-backed calendar so events reach Google Calendar.
   * Falls back to the device default, then to a dedicated local calendar — the
   * last case is local-only, and the UI says so rather than implying sync.
   */
  async getTargetCalendar() {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.filter(isWritable);

    const google = writable.find(looksGoogle);
    if (google) {
      return {
        id: google.id,
        title: google.title,
        source: google.source?.name ?? 'Google',
        isGoogle: true,
      };
    }

    if (Platform.OS === 'ios') {
      try {
        const fallback = await Calendar.getDefaultCalendarAsync();
        if (fallback && isWritable(fallback)) {
          return {
            id: fallback.id,
            title: fallback.title,
            source: fallback.source?.name ?? 'Default',
            isGoogle: looksGoogle(fallback),
          };
        }
      } catch {
        // fall through
      }
    }

    const primary = writable.find((c) => c.isPrimary) ?? writable[0];
    if (primary) {
      return {
        id: primary.id,
        title: primary.title,
        source: primary.source?.name ?? 'Device',
        isGoogle: looksGoogle(primary),
      };
    }

    return ensureLocalCalendar();
  },

  async createEvent(reminder) {
    const target = await this.getTargetCalendar();
    if (!target) return null;

    const { start, end } = eventDates(reminder.due_date);

    return Calendar.createEventAsync(target.id, {
      title: reminder.title,
      startDate: start,
      endDate: end,
      notes: reminder.notes,
      recurrenceRule: toRecurrenceRule(reminder.recurrence_rule),
    });
  },

  async updateEvent(eventId, reminder) {
    const { start, end } = eventDates(reminder.due_date);
    try {
      await Calendar.updateEventAsync(eventId, {
        title: reminder.title,
        startDate: start,
        endDate: end,
        notes: reminder.notes,
        recurrenceRule: toRecurrenceRule(reminder.recurrence_rule),
      });
    } catch {
      // Event was deleted out from under us — nothing to update.
    }
  },

  async deleteEvent(eventId) {
    try {
      await Calendar.deleteEventAsync(eventId);
    } catch {
      // Already gone; treat as success.
    }
  },
};
