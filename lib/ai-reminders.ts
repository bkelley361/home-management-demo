import { supabase } from '@/lib/supabase';
import {
  generalAssetSuggestions,
  vehicleSuggestions,
  type LegacyAssetKind,
  type ReminderSuggestion,
} from '@/lib/reminder-suggestions';
import { buildAutoReminderPayload } from '@/lib/reminders';

export type AssetReminderParams = {
  assetId: string;
  assetType: 'vehicle' | 'general';
  vehicle?: {
    year: number;
    make: string;
    model: string;
    trim?: string;
    mileage?: number;
  };
  general?: {
    name: string;
    categoryName: string;
    legacyKind?: string | null;
    brand?: string | null;
    model_number?: string | null;
    serial_number?: string | null;
    install_date?: number | null;
    location_in_home?: string | null;
  };
};

/**
 * Generates upkeep reminders for an asset using rich template suggestions.
 */
export async function getComprehensiveReminders(
  params: AssetReminderParams,
  _authToken?: string
): Promise<ReminderSuggestion[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (params.assetType === 'vehicle') {
    return vehicleSuggestions({
      mileage: params.vehicle?.mileage ?? 0,
      assetId: params.assetId,
    });
  }

  return generalAssetSuggestions({
    legacyKind: (params.general?.legacyKind as LegacyAssetKind) ?? null,
    install_date: params.general?.install_date,
    assetId: params.assetId,
    name: params.general?.name,
    categoryName: params.general?.categoryName,
  });
}

/**
 * Automatically schedule the recommended maintenance reminders for this asset.
 */
export async function autoScheduleAssetReminders(
  homeId: string,
  assetId: string,
  suggestions: ReminderSuggestion[]
): Promise<number> {
  const chosen = suggestions.filter((s) => s.recommended);
  if (chosen.length === 0) return 0;

  const payload = chosen.map((s) => buildAutoReminderPayload(s, { asset: assetId }));
  const { error } = await supabase.rpc('accept_auto_reminders', {
    p_home_id: homeId,
    p_reminders: payload,
  });

  if (error) {
    console.warn('Could not auto-schedule reminders:', error);
    return 0;
  }

  return chosen.length;
}
