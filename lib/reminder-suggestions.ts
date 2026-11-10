import { addMonths, computeNextDue, nextSeasonalDate, parseRule } from '@/lib/recurrence';

/**
 * Auto-suggested maintenance reminders for every asset type.
 *
 * Each suggestion carries a stable `key`, which is written to
 * `reminders.auto_key` when accepted. That is what lets the suggestions UI
 * filter out anything already accepted, so revisiting the screen never offers
 * a duplicate.
 */
export type ReminderSuggestion = {
  /** Stable slug — must never change for an existing suggestion. */
  key: string;
  title: string;
  recurrenceRule: string;
  dueDate: number;
  /** Selected by default in the checklist. */
  recommended: boolean;
  /** Odometer target — set only for mileage-based vehicle suggestions. */
  dueMileage?: number;
};

const MONTHS_3 = 3;

function inMonths(months: number, from?: number) {
  return addMonths(from ?? Date.now(), months);
}

// ---------------------------------------------------------------------------
// General assets — legacy kinds retain their established suggestion keys.
// ---------------------------------------------------------------------------

export type LegacyAssetKind = 'furnace' | 'water_heater' | 'sprinkler_system' | 'other_appliance';

export type GeneralAssetInput = {
  legacyKind?: LegacyAssetKind | null;
  install_date?: number | null;
  assetId: string;
  name?: string | null;
  categoryName?: string | null;
};

export function generalAssetSuggestions({
  legacyKind,
  install_date,
  assetId,
  name,
  categoryName,
}: GeneralAssetInput): ReminderSuggestion[] {
  const anchor = install_date ?? undefined;
  const scope = assetId ? `_${assetId.slice(-8)}` : '';
  const search = `${name ?? ''} ${categoryName ?? ''} ${legacyKind ?? ''}`.toLowerCase();

  // 1. HVAC / Furnace / AC / Heat Pump
  if (
    legacyKind === 'furnace' ||
    search.includes('furnace') ||
    search.includes('hvac') ||
    search.includes('heat pump') ||
    search.includes('air condition') ||
    search.includes('mini split')
  ) {
    return [
      {
        key: `furnace_filter${scope}`,
        title: 'Replace HVAC / furnace filter',
        recurrenceRule: 'every_3_months',
        dueDate: inMonths(MONTHS_3, anchor),
        recommended: true,
      },
      {
        key: `hvac_summer_prep${scope}`,
        title: 'Inspect & clean outdoor AC condenser unit',
        recurrenceRule: 'seasonal_spring',
        dueDate: nextSeasonalDate('spring'),
        recommended: true,
      },
      {
        key: `furnace_service${scope}`,
        title: 'Professional heating system service',
        recurrenceRule: 'seasonal_fall',
        dueDate: nextSeasonalDate('fall'),
        recommended: true,
      },
    ];
  }

  // 2. Water Heater / Boiler
  if (
    legacyKind === 'water_heater' ||
    search.includes('water heater') ||
    search.includes('boiler') ||
    search.includes('tankless')
  ) {
    return [
      {
        key: `water_heater_flush${scope}`,
        title: 'Flush water heater tank sediment',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: true,
      },
      {
        key: `water_heater_anode${scope}`,
        title: 'Inspect / replace sacrificial anode rod',
        recurrenceRule: 'every_3_years',
        dueDate: inMonths(36, anchor),
        recommended: true,
      },
      {
        key: `water_heater_tpr${scope}`,
        title: 'Test temperature & pressure relief valve',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: false,
      },
    ];
  }

  // 3. Sprinkler System / Irrigation
  if (
    legacyKind === 'sprinkler_system' ||
    search.includes('sprinkler') ||
    search.includes('irrigation')
  ) {
    return [
      {
        key: `sprinkler_winterize${scope}`,
        title: 'Blow out & winterize sprinkler system',
        recurrenceRule: 'seasonal_fall',
        dueDate: nextSeasonalDate('fall'),
        recommended: true,
      },
      {
        key: `sprinkler_startup${scope}`,
        title: 'Spring sprinkler start-up & head inspection',
        recurrenceRule: 'seasonal_spring',
        dueDate: nextSeasonalDate('spring'),
        recommended: true,
      },
      {
        key: `sprinkler_backflow${scope}`,
        title: 'Annual backflow prevention test',
        recurrenceRule: 'every_12_months',
        dueDate: nextSeasonalDate('spring'),
        recommended: false,
      },
    ];
  }

  // 4. Refrigerator / Freezer
  if (search.includes('fridge') || search.includes('refrigerator') || search.includes('freezer')) {
    return [
      {
        key: `fridge_coils${scope}`,
        title: 'Clean refrigerator condenser coils',
        recurrenceRule: 'every_6_months',
        dueDate: inMonths(6, anchor),
        recommended: true,
      },
      {
        key: `fridge_filter${scope}`,
        title: 'Replace internal water filter',
        recurrenceRule: 'every_6_months',
        dueDate: inMonths(6, anchor),
        recommended: true,
      },
      {
        key: `fridge_gasket${scope}`,
        title: 'Inspect & wipe down door gaskets',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: false,
      },
    ];
  }

  // 5. Dishwasher
  if (search.includes('dishwasher')) {
    return [
      {
        key: `dishwasher_filter${scope}`,
        title: 'Clean dishwasher bottom filter trap',
        recurrenceRule: 'every_1_months',
        dueDate: inMonths(1, anchor),
        recommended: true,
      },
      {
        key: `dishwasher_descaling${scope}`,
        title: 'Run descaling & deep cleaning cycle',
        recurrenceRule: 'every_3_months',
        dueDate: inMonths(3, anchor),
        recommended: true,
      },
      {
        key: `dishwasher_spray_arms${scope}`,
        title: 'Inspect spray arms & door seals',
        recurrenceRule: 'every_6_months',
        dueDate: inMonths(6, anchor),
        recommended: false,
      },
    ];
  }

  // 6. Washing Machine
  if (
    search.includes('washer') ||
    search.includes('washing machine') ||
    search.includes('laundry')
  ) {
    return [
      {
        key: `washer_clean_cycle${scope}`,
        title: 'Run washing machine tub-clean cycle',
        recurrenceRule: 'every_1_months',
        dueDate: inMonths(1, anchor),
        recommended: true,
      },
      {
        key: `washer_pump_filter${scope}`,
        title: 'Clean front drain pump filter trap',
        recurrenceRule: 'every_3_months',
        dueDate: inMonths(3, anchor),
        recommended: true,
      },
      {
        key: `washer_hoses${scope}`,
        title: 'Inspect rubber water supply hoses for bulges',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: false,
      },
    ];
  }

  // 7. Clothes Dryer
  if (search.includes('dryer')) {
    return [
      {
        key: `dryer_exhaust_duct${scope}`,
        title: 'Clean dryer exhaust duct line to outside',
        recurrenceRule: 'every_6_months',
        dueDate: inMonths(6, anchor),
        recommended: true,
      },
      {
        key: `dryer_lint_housing${scope}`,
        title: 'Vacuum lint trap cavity & housing',
        recurrenceRule: 'every_3_months',
        dueDate: inMonths(3, anchor),
        recommended: true,
      },
    ];
  }

  // 8. Sump Pump
  if (search.includes('sump') || search.includes('pump')) {
    return [
      {
        key: `sump_pump_test${scope}`,
        title: 'Test sump pump float switch & operation',
        recurrenceRule: 'every_3_months',
        dueDate: inMonths(3, anchor),
        recommended: true,
      },
      {
        key: `sump_battery_check${scope}`,
        title: 'Test sump pump backup battery',
        recurrenceRule: 'every_6_months',
        dueDate: inMonths(6, anchor),
        recommended: true,
      },
      {
        key: `sump_pit_clean${scope}`,
        title: 'Clean sediment from sump basin',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: false,
      },
    ];
  }

  // 9. Water Softener / Filtration
  if (search.includes('softener') || search.includes('water filter')) {
    return [
      {
        key: `softener_salt${scope}`,
        title: 'Check and refill water softener salt',
        recurrenceRule: 'every_1_months',
        dueDate: inMonths(1, anchor),
        recommended: true,
      },
      {
        key: `softener_clean${scope}`,
        title: 'Clean water softener brine tank',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: false,
      },
    ];
  }

  // 10. Lawn Mower / Outdoor Power
  if (
    search.includes('mower') ||
    search.includes('lawn') ||
    search.includes('snow') ||
    search.includes('tractor')
  ) {
    return [
      {
        key: `mower_oil_change${scope}`,
        title: 'Change engine oil & check spark plug',
        recurrenceRule: 'seasonal_spring',
        dueDate: nextSeasonalDate('spring'),
        recommended: true,
      },
      {
        key: `mower_blade_sharpen${scope}`,
        title: 'Sharpen cutting blade & check deck belt',
        recurrenceRule: 'seasonal_spring',
        dueDate: nextSeasonalDate('spring'),
        recommended: true,
      },
    ];
  }

  // 11. Generator
  if (search.includes('generator')) {
    return [
      {
        key: `generator_exercise${scope}`,
        title: 'Run generator test cycle under load',
        recurrenceRule: 'every_1_months',
        dueDate: inMonths(1, anchor),
        recommended: true,
      },
      {
        key: `generator_oil${scope}`,
        title: 'Change generator engine oil & filter',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: true,
      },
      {
        key: `generator_battery${scope}`,
        title: 'Inspect starter battery & terminals',
        recurrenceRule: 'every_6_months',
        dueDate: inMonths(6, anchor),
        recommended: false,
      },
    ];
  }

  // 12. Smoke / CO Detector
  if (
    search.includes('smoke') ||
    search.includes('carbon monoxide') ||
    search.includes('alarm') ||
    search.includes('detector')
  ) {
    return [
      {
        key: `detector_test${scope}`,
        title: 'Test alarm button & siren sound',
        recurrenceRule: 'every_1_months',
        dueDate: inMonths(1, anchor),
        recommended: true,
      },
      {
        key: `detector_batteries${scope}`,
        title: 'Replace detector backup batteries',
        recurrenceRule: 'every_12_months',
        dueDate: inMonths(12, anchor),
        recommended: true,
      },
    ];
  }

  // Default fallback for any other general asset
  return [
    {
      key: `general_asset_clean${scope}`,
      title: 'Routine cleaning and inspection',
      recurrenceRule: 'every_6_months',
      dueDate: inMonths(6, anchor),
      recommended: true,
    },
    {
      key: `general_asset_service${scope}`,
      title: 'Annual performance and safety check',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12, anchor),
      recommended: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Vehicles — comprehensive upkeep schedule
// ---------------------------------------------------------------------------

export type VehicleInput = {
  mileage: number;
  purchase_date?: number | null;
  assetId?: string;
};

export function vehicleSuggestions({ mileage, assetId }: VehicleInput): ReminderSuggestion[] {
  const scope = assetId ? `_${assetId.slice(-8)}` : '';
  const mileageSuggestion = (
    key: string,
    title: string,
    miles: number,
    recommended: boolean
  ): ReminderSuggestion => ({
    key: `${key}${scope}`,
    title,
    recurrenceRule: `every_${miles}_miles`,
    dueDate: inMonths(Math.max(1, Math.round((miles / 12_000) * 12))),
    recommended,
    dueMileage: mileage + miles,
  });

  return [
    mileageSuggestion('vehicle_oil_change', 'Oil and filter change', 5000, true),
    mileageSuggestion('vehicle_tire_rotation', 'Rotate tires', 7500, true),
    mileageSuggestion('vehicle_brake_inspection', 'Inspect brake pads & rotors', 15000, false),
    {
      key: `vehicle_engine_air_filter${scope}`,
      title: 'Replace engine air filter',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: true,
    },
    {
      key: `vehicle_cabin_air_filter${scope}`,
      title: 'Replace cabin air filter',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: true,
    },
    {
      key: `vehicle_wiper_blades${scope}`,
      title: 'Replace windshield wiper blades',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: false,
    },
    {
      key: `vehicle_registration${scope}`,
      title: 'Vehicle registration & inspection renewal',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// The home itself — driven by the fields collected during onboarding
// ---------------------------------------------------------------------------

type HomeInput = {
  water_source: string;
  waste_system: string;
  has_sprinklers: boolean;
  acreage?: number | null;
};

export function homeSuggestions({
  water_source,
  waste_system,
  has_sprinklers,
  acreage,
}: HomeInput): ReminderSuggestion[] {
  const suggestions: ReminderSuggestion[] = [
    {
      key: 'home_gutters',
      title: 'Clean gutters',
      recurrenceRule: 'seasonal_fall',
      dueDate: nextSeasonalDate('fall'),
      recommended: true,
    },
    {
      key: 'home_smoke_detectors',
      title: 'Replace smoke / CO detector batteries',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: true,
    },
    {
      key: 'home_dryer_vent',
      title: 'Clean dryer vent',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: true,
    },
    {
      key: 'home_hvac_service',
      title: 'HVAC service before cooling season',
      recurrenceRule: 'seasonal_spring',
      dueDate: nextSeasonalDate('spring'),
      recommended: true,
    },
  ];

  if (water_source === 'well') {
    suggestions.push({
      key: 'home_well_water_test',
      title: 'Test well water quality',
      recurrenceRule: 'every_12_months',
      dueDate: inMonths(12),
      recommended: true,
    });
  }

  if (waste_system === 'septic') {
    suggestions.push({
      key: 'home_septic_pump',
      title: 'Pump septic tank',
      recurrenceRule: 'every_3_years',
      dueDate: inMonths(36),
      recommended: true,
    });
  }

  if (has_sprinklers) {
    suggestions.push(
      {
        key: 'home_sprinkler_winterize',
        title: 'Winterize sprinkler system',
        recurrenceRule: 'seasonal_fall',
        dueDate: nextSeasonalDate('fall'),
        recommended: true,
      },
      {
        key: 'home_sprinkler_startup',
        title: 'Spring sprinkler start-up',
        recurrenceRule: 'seasonal_spring',
        dueDate: nextSeasonalDate('spring'),
        recommended: true,
      }
    );
  }

  if (acreage) {
    suggestions.push({
      key: 'home_lawn_fertilize',
      title: 'Fertilize lawn',
      recurrenceRule: 'seasonal_spring',
      dueDate: nextSeasonalDate('spring'),
      recommended: false,
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Warranty — a one-time nudge before coverage lapses
// ---------------------------------------------------------------------------

/** How far ahead of expiry to remind. Useful while still claimable, not after. */
export const WARRANTY_LEAD_DAYS = 30;

/**
 * Reminder to use or check a warranty before it expires.
 *
 * Deliberately `recurrenceRule: 'none'` — a warranty expires once. That is safe
 * with the completion machinery and worth stating because it looks like an
 * oversight: `parseRule('none')` → `{kind:'none'}` → `computeNextDue` returns
 * `{dueDate: null}` → `buildCompleteReminderTx` bails with `nextReminderId:
 * null`. So completing this reminder correctly spawns no successor.
 *
 * Returns null once expiry has already passed — there's nothing to act on.
 */
export function warrantySuggestion(
  assetLabel: string,
  warrantyExpiresAt?: number | null,
  assetId?: string,
  now = Date.now()
): ReminderSuggestion | null {
  if (!warrantyExpiresAt || warrantyExpiresAt <= now) return null;

  const leadMs = WARRANTY_LEAD_DAYS * 24 * 60 * 60 * 1000;
  // If expiry is nearer than the lead time, remind now rather than in the past.
  const dueDate = Math.max(warrantyExpiresAt - leadMs, now);
  const scope = assetId ? `_${assetId.slice(-12)}` : '';

  return {
    key: `warranty_expiring${scope}`,
    title: `${assetLabel} warranty expires soon`,
    recurrenceRule: 'none',
    dueDate,
    recommended: true,
  };
}

// ---------------------------------------------------------------------------
// Parts — a saved part with a replacement interval suggests its own reminder
// ---------------------------------------------------------------------------

/**
 * Advance a recurrence forward from `anchor` until it lands in the future.
 *
 * `computeNextDue` adds exactly one interval, which isn't enough on its own: a
 * part last replaced 400 days ago on a 3-month rule is four intervals behind, so
 * one step still leaves the reminder overdue on the day it's created. Loop until
 * it's genuinely ahead of now.
 *
 * Mileage rules are excluded — those advance by odometer reading, not by date,
 * and their calendar date is only a rough projection.
 */
function nextDueAfterNow(rule: string, anchor: number, now = Date.now()): number {
  const parsed = parseRule(rule);
  if (parsed.kind === 'none' || parsed.kind === 'mileage') {
    return computeNextDue(rule, anchor).dueDate ?? now;
  }

  let due = anchor;
  // Bounded so a degenerate rule can never spin forever. 500 steps covers every
  // realistic case (500 days for a daily rule, ~41 years for a monthly one);
  // anything that exhausts it is absurd data like a daily part untouched for a
  // decade, and "due today" is the right answer there anyway.
  for (let i = 0; i < 500 && due <= now; i++) {
    const next = computeNextDue(rule, due).dueDate;
    if (next === null || next <= due) break;
    due = next;
  }

  // Never hand back a past date — the caller would create an already-overdue
  // reminder, which is the bug this function exists to prevent.
  return Math.max(due, now);
}

/**
 * Reminder for a saved part that has a replacement interval.
 *
 * `assetId` scopes the `auto_key`: the same part name can exist on two different
 * assets ("air filter" on the furnace and on the car), and a key derived from the
 * name alone would make the second one look already-accepted to the
 * `existingKeys` filter in components/reminder-suggestions.tsx.
 *
 * Never change the shape of an already-issued key — accepted reminders carry it
 * in `reminders.auto_key`, and a changed key resurfaces a dismissed suggestion.
 */
export function partSuggestion(
  partName: string,
  replacementRule: string,
  lastReplacedDate?: number | null,
  assetId?: string
): ReminderSuggestion | null {
  if (!replacementRule || replacementRule === 'none') return null;

  const slug = partName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  // Use the UUID tail so different assets get deterministic, low-collision keys.
  const scope = assetId ? `_${assetId.slice(-12)}` : '';

  const dueDate = lastReplacedDate
    ? nextDueAfterNow(replacementRule, lastReplacedDate)
    : Date.now();

  return {
    key: `part_${slug}${scope}`,
    title: `Replace ${partName.toLowerCase()}`,
    recurrenceRule: replacementRule,
    dueDate,
    recommended: true,
  };
}
