/**
 * Canonical recurrence rule grammar.
 *
 *   none
 *   every_N_days | every_N_weeks | every_N_months | every_N_years
 *   weekly | monthly | yearly          (aliases for every_1_<unit>)
 *   seasonal_spring | seasonal_summer | seasonal_fall | seasonal_winter
 *   every_N_miles                      (vehicles only)
 *
 * Every rule the app writes must round-trip through `parseRule`. Keep the
 * picker (components/ui/recurrence-picker.tsx) and this file in sync — the
 * picker only ever emits strings built by `buildRule`.
 */

export type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type ParsedRule =
  | { kind: 'none' }
  | { kind: 'interval'; unit: RecurrenceUnit; count: number }
  | { kind: 'seasonal'; season: Season }
  | { kind: 'mileage'; miles: number };

const ALIASES: Record<string, string> = {
  weekly: 'every_1_weeks',
  monthly: 'every_1_months',
  yearly: 'every_1_years',
  annually: 'every_1_years',
};

const INTERVAL_RULE = /^every_(\d+)_(day|week|month|year)s?$/;
const SEASONAL_RULE = /^seasonal_(spring|summer|fall|winter)$/;
const MILEAGE_RULE = /^every_(\d+)_miles?$/;

/** Anchor date (month index, day) each seasonal rule snaps to. */
const SEASON_ANCHORS: Record<Season, { month: number; day: number }> = {
  spring: { month: 2, day: 20 }, // Mar 20
  summer: { month: 5, day: 20 }, // Jun 20
  fall: { month: 9, day: 15 }, // Oct 15 — matches the old nextOctoberFifteenth()
  winter: { month: 11, day: 1 }, // Dec 1
};

/** Rough annual mileage, used only to give mileage rules a sortable due date. */
const ASSUMED_MILES_PER_YEAR = 12_000;

export function parseRule(rule: string): ParsedRule {
  const normalized = ALIASES[rule] ?? rule;

  if (!normalized || normalized === 'none') return { kind: 'none' };

  const interval = normalized.match(INTERVAL_RULE);
  if (interval) {
    const count = Number(interval[1]);
    if (count >= 1) {
      return { kind: 'interval', unit: `${interval[2]}s` as RecurrenceUnit, count };
    }
  }

  const seasonal = normalized.match(SEASONAL_RULE);
  if (seasonal) return { kind: 'seasonal', season: seasonal[1] as Season };

  const mileage = normalized.match(MILEAGE_RULE);
  if (mileage) {
    const miles = Number(mileage[1]);
    if (miles >= 1) return { kind: 'mileage', miles };
  }

  return { kind: 'none' };
}

export function buildRule(parsed: ParsedRule): string {
  switch (parsed.kind) {
    case 'none':
      return 'none';
    case 'interval':
      return `every_${parsed.count}_${parsed.unit}`;
    case 'seasonal':
      return `seasonal_${parsed.season}`;
    case 'mileage':
      return `every_${parsed.miles}_miles`;
  }
}

export function isMileageRule(rule: string): boolean {
  return parseRule(rule).kind === 'mileage';
}

/**
 * Add months without the JS date-overflow bug: `new Date(2026, 0, 31)` with
 * setMonth(+1) rolls into March. Clamp to the last valid day of the target
 * month instead, so a Jan 31 reminder recurring monthly lands on Feb 28.
 */
export function addMonths(baseDate: number, months: number): number {
  const date = new Date(baseDate);
  const day = date.getDate();
  const target = new Date(date);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  target.setHours(date.getHours(), date.getMinutes(), 0, 0);
  return target.getTime();
}

export function addDays(baseDate: number, days: number): number {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** Next occurrence of a season's anchor date strictly after `after`. */
export function nextSeasonalDate(season: Season, after: number = Date.now()): number {
  const { month, day } = SEASON_ANCHORS[season];
  const afterDate = new Date(after);
  const thisYear = new Date(afterDate.getFullYear(), month, day).getTime();
  return thisYear > after ? thisYear : new Date(afterDate.getFullYear() + 1, month, day).getTime();
}

export type NextDue = {
  /** Null only when the rule does not recur. */
  dueDate: number | null;
  /** Set for mileage rules: the odometer reading the next occurrence is due at. */
  dueMileage?: number;
};

export type NextDueOptions = {
  /** Current odometer reading — required for mileage rules to advance. */
  currentMileage?: number;
};

/**
 * Given a rule and the due date of the occurrence just completed, compute the
 * next occurrence. Returns `{ dueDate: null }` for non-recurring rules.
 */
export function computeNextDue(
  rule: string,
  completedDueDate: number,
  options: NextDueOptions = {}
): NextDue {
  const parsed = parseRule(rule);

  switch (parsed.kind) {
    case 'none':
      return { dueDate: null };

    case 'interval': {
      const { unit, count } = parsed;
      if (unit === 'days') return { dueDate: addDays(completedDueDate, count) };
      if (unit === 'weeks') return { dueDate: addDays(completedDueDate, count * 7) };
      if (unit === 'months') return { dueDate: addMonths(completedDueDate, count) };
      return { dueDate: addMonths(completedDueDate, count * 12) };
    }

    case 'seasonal':
      // Re-anchor to the season rather than blindly adding 12 months, so a
      // reminder completed early or late still lands on the right date.
      return { dueDate: nextSeasonalDate(parsed.season, Math.max(completedDueDate, Date.now())) };

    case 'mileage': {
      const { miles } = parsed;
      // Project an estimated calendar date so the reminder still sorts sensibly
      // in date-ordered lists; the odometer target is what actually matters.
      const estimatedDays = Math.round((miles / ASSUMED_MILES_PER_YEAR) * 365);
      const dueDate = addDays(Math.max(completedDueDate, Date.now()), estimatedDays);
      const currentMileage = options.currentMileage;
      return {
        dueDate,
        dueMileage: currentMileage === undefined ? undefined : currentMileage + miles,
      };
    }
  }
}

const UNIT_LABELS: Record<RecurrenceUnit, [singular: string, plural: string]> = {
  days: ['day', 'days'],
  weeks: ['week', 'weeks'],
  months: ['month', 'months'],
  years: ['year', 'years'],
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Every spring',
  summer: 'Every summer',
  fall: 'Every fall',
  winter: 'Every winter',
};

/** Human-readable label for a rule, e.g. "Every 3 months". */
export function formatRecurrenceRule(rule: string): string {
  const parsed = parseRule(rule);

  switch (parsed.kind) {
    case 'none':
      return 'Does not repeat';
    case 'interval': {
      const [singular, plural] = UNIT_LABELS[parsed.unit];
      if (parsed.count === 1) {
        return { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }[
          singular as 'day' | 'week' | 'month' | 'year'
        ];
      }
      return `Every ${parsed.count} ${plural}`;
    }
    case 'seasonal':
      return SEASON_LABELS[parsed.season];
    case 'mileage':
      return `Every ${parsed.miles.toLocaleString()} miles`;
  }
}
