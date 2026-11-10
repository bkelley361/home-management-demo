import * as React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Car,
  Droplets,
  Flame,
  Hammer,
  House,
  Leaf,
  Lightbulb,
  Monitor,
  Package,
  Refrigerator,
  Sprout,
  Tv,
  Wrench,
} from 'lucide-react-native';

import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase as db } from '@/lib/supabase';
import { useCurrentHome } from '@/lib/use-current-home';

export const ASSET_CATEGORY_ICONS = {
  car: Car,
  house: House,
  tv: Tv,
  monitor: Monitor,
  wrench: Wrench,
  hammer: Hammer,
  briefcase: Briefcase,
  leaf: Leaf,
  sprout: Sprout,
  lightbulb: Lightbulb,
  package: Package,
  flame: Flame,
  droplets: Droplets,
  refrigerator: Refrigerator,
} as const;
export type AssetCategoryIconKey = keyof typeof ASSET_CATEGORY_ICONS;
export type AssetTemplate = 'vehicle' | 'general';
export type AssetCategory = Omit<
  Tables<'asset_categories'>,
  'asset_type' | 'icon_key' | 'color_key' | 'legacy_kind'
> & {
  asset_type: AssetTemplate;
  icon_key: AssetCategoryIconKey;
  color_key: 'primary' | 'secondary' | 'accent' | 'muted' | null;
  legacy_kind: 'furnace' | 'water_heater' | 'sprinkler_system' | 'other_appliance' | null;
};
export const ASSET_CATEGORY_COLOR_CLASSES = {
  primary: { background: 'bg-primary', icon: 'text-primary-foreground' },
  secondary: { background: 'bg-secondary', icon: 'text-secondary-foreground' },
  accent: { background: 'bg-accent', icon: 'text-accent-foreground' },
  muted: { background: 'bg-muted', icon: 'text-muted-foreground' },
} as const;

const ICON_KEYS = Object.keys(ASSET_CATEGORY_ICONS) as AssetCategoryIconKey[];
const COLORS = [
  { key: 'primary', label: 'Primary', style: 'bg-primary' },
  { key: 'secondary', label: 'Secondary', style: 'bg-secondary' },
  { key: 'accent', label: 'Accent', style: 'bg-accent' },
  { key: 'muted', label: 'Muted', style: 'bg-muted' },
  { key: null, label: 'None', style: 'bg-transparent' },
] as const;

type Props = {
  initial?: AssetCategory;
  allowTemplateChange?: boolean;
  onSaved: (category: AssetCategory) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function AssetCategoryEditor({
  initial,
  allowTemplateChange = true,
  onSaved,
  onCancel,
  submitLabel = 'Save category',
}: Props) {
  const { homeId } = useCurrentHome();
  const [name, setName] = React.useState(initial?.name ?? '');
  const [assetType, setAssetType] = React.useState<AssetTemplate | null>(
    initial?.asset_type ?? null
  );
  const [iconKey, setIconKey] = React.useState<AssetCategoryIconKey>(
    initial?.icon_key ?? 'package'
  );
  const [colorKey, setColorKey] = React.useState<AssetCategory['color_key']>(
    initial?.color_key ?? null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(initial?.name ?? '');
    setAssetType(initial?.asset_type ?? null);
    setIconKey(initial?.icon_key ?? 'package');
    setColorKey(initial?.color_key ?? null);
  }, [initial?.id, initial?.name, initial?.asset_type, initial?.icon_key, initial?.color_key]);

  async function save() {
    const trimmedName = name.trim();
    if (!homeId || !trimmedName) {
      setError('Enter a category name.');
      return;
    }
    if (!initial?.id && !assetType) {
      setError('Choose a Vehicle or General item form.');
      return;
    }
    const template = initial?.asset_type ?? assetType;
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      const result = initial?.id
        ? await db
            .from('asset_categories')
            .update({ name: trimmedName, icon_key: iconKey, color_key: colorKey })
            .eq('id', initial.id)
            .eq('home_id', homeId)
            .select('*')
            .single()
        : await db
            .from('asset_categories')
            .insert({
              home_id: homeId,
              name: trimmedName,
              icon_key: iconKey,
              color_key: colorKey,
              asset_type: template,
              legacy_kind: null,
            } satisfies TablesInsert<'asset_categories'>)
            .select('*')
            .single();
      if (result.error) {
        if (result.error.code === '23505')
          throw new Error('Category name already exists for this home.');
        throw result.error;
      }
      onSaved(result.data as AssetCategory);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="w-full gap-5">
      <View className="w-full gap-1.5">
        <Label htmlFor="asset-category-name">Name</Label>
        <Input id="asset-category-name" value={name} onChangeText={setName} maxLength={80} />
      </View>
      {allowTemplateChange ? (
        <View className="w-full gap-2">
          <Text className="font-medium">Item form</Text>
          <View className="w-full flex-row gap-2">
            {(['vehicle', 'general'] as const).map((type) => (
              <Button
                key={type}
                variant={assetType === type ? 'default' : 'outline'}
                className="flex-1"
                onPress={() => setAssetType(type)}>
                <Text>{type === 'vehicle' ? 'Vehicle' : 'General'}</Text>
              </Button>
            ))}
          </View>
        </View>
      ) : (
        <Text className="text-muted-foreground">
          {assetType
            ? `${assetType === 'vehicle' ? 'Vehicle' : 'General'} item form`
            : 'Choose a form for items in this category.'}
        </Text>
      )}
      <View className="w-full gap-2">
        <Text className="font-medium">Icon</Text>
        <View className="w-full flex-row flex-wrap gap-2">
          {ICON_KEYS.map((key) => {
            const IconComponent = ASSET_CATEGORY_ICONS[key];
            const selected = iconKey === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${key} icon`}
                accessibilityState={{ selected }}
                onPress={() => setIconKey(key)}
                className={cn(
                  'size-11 items-center justify-center rounded-full border active:opacity-80',
                  selected
                    ? 'border-2 border-primary bg-muted dark:bg-[#1E2026]'
                    : 'border-border bg-card dark:bg-[#1A1D23]'
                )}>
                <Icon
                  as={IconComponent}
                  size={19}
                  className={selected ? 'text-primary' : 'text-muted-foreground'}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View className="w-full gap-2">
        <Text className="font-medium">Color</Text>
        <View className="w-full flex-row flex-wrap items-center gap-2">
          {COLORS.map((color) => {
            const selected = colorKey === color.key;
            return (
              <Pressable
                key={color.key ?? 'none'}
                accessibilityRole="button"
                accessibilityLabel={`${color.label} color`}
                accessibilityState={{ selected }}
                onPress={() => setColorKey(color.key)}
                className={cn(
                  'size-10 items-center justify-center rounded-full border active:opacity-80',
                  color.style,
                  selected ? 'border-2 border-foreground' : 'border-border'
                )}>
                {selected ? <Text className="text-xs font-bold text-foreground">✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <FormError message={error} />
      <View className="w-full flex-row gap-3 pt-2">
        {onCancel ? (
          <Button variant="outline" className="flex-1 rounded-full" onPress={onCancel}>
            <Text>Cancel</Text>
          </Button>
        ) : null}
        <Button className="flex-1 rounded-full shadow-sm" onPress={save} disabled={saving}>
          <Text>{saving ? 'Saving…' : submitLabel}</Text>
        </Button>
      </View>
    </View>
  );
}
