import type { Tables } from '@/lib/database.types';
import { computeNextDue, isMileageRule } from '@/lib/recurrence';
import type { ReminderSuggestion } from '@/lib/reminder-suggestions';

export { formatRecurrenceRule, isMileageRule } from '@/lib/recurrence';
export type { ReminderSuggestion } from '@/lib/reminder-suggestions';

export type AutoReminderPayload = {
  title: string;
  recurrence_rule: string;
  due_date: number;
  due_mileage?: number | null;
  auto_key: string;
  asset_id?: string | null;
  utility_provider_id?: string | null;
  part_id?: string | null;
};

/** Build the RPC payload for a selected suggestion, retaining stable dedupe keys. */
export function buildAutoReminderPayload(
  suggestion: ReminderSuggestion,
  link?: Partial<Record<'asset' | 'utility_provider' | 'part', string>>
): AutoReminderPayload {
  return {
    title: suggestion.title,
    recurrence_rule: suggestion.recurrenceRule,
    due_date: suggestion.dueDate,
    due_mileage: suggestion.dueMileage ?? null,
    auto_key: suggestion.key,
    ...(link?.asset ? { asset_id: link.asset } : {}),
    ...(link?.utility_provider ? { utility_provider_id: link.utility_provider } : {}),
    ...(link?.part ? { part_id: link.part } : {}),
  };
}

export type CompletableReminder = Tables<'reminders'> & {
  asset?: Pick<Tables<'assets'>, 'id' | 'asset_type' | 'mileage'> | null;
};

export type CompleteOptions = {
  /** Odometer reading at completion — required to advance a mileage rule. */
  currentMileage?: number;
};

export const REMINDER_UNDO_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function computeReminderSuccessor(
  reminder: CompletableReminder,
  options: CompleteOptions = {}
) {
  return computeNextDue(reminder.recurrence_rule, reminder.due_date, {
    currentMileage:
      reminder.asset?.asset_type === 'vehicle'
        ? (options.currentMileage ?? reminder.asset.mileage ?? undefined)
        : undefined,
  });
}

export function nextMonthlyDueDate(dayOfMonth: number) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  return thisMonth.getTime() > now.getTime()
    ? thisMonth.getTime()
    : new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth).getTime();
}

/** True when a reminder is past due and still outstanding. */
export function isOverdue(reminder: { due_date: number; status: string }, now = Date.now()) {
  return reminder.status === 'upcoming' && reminder.due_date < startOfDay(now);
}

export function startOfDay(timestamp = Date.now()) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(timestamp = Date.now()) {
  const d = new Date(timestamp);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export {
  generalAssetSuggestions,
  homeSuggestions,
  partSuggestion,
  vehicleSuggestions,
  warrantySuggestion,
  WARRANTY_LEAD_DAYS,
} from '@/lib/reminder-suggestions';
export type { LegacyAssetKind } from '@/lib/reminder-suggestions';
