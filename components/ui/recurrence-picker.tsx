import * as React from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { buildRule, formatRecurrenceRule, parseRule, type RecurrenceUnit } from '@/lib/recurrence';

/** Preset rules offered in the dropdown, in order. */
const PRESETS = [
  'none',
  'weekly',
  'every_2_weeks',
  'monthly',
  'every_3_months',
  'every_6_months',
  'yearly',
  'every_2_years',
  'seasonal_spring',
  'seasonal_summer',
  'seasonal_fall',
  'seasonal_winter',
] as const;

const CUSTOM_VALUE = '__custom__';
const MILEAGE_VALUE = '__mileage__';

const UNIT_OPTIONS: { value: RecurrenceUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

type Props = {
  value: string;
  onChange: (rule: string) => void;
  /** Show the mileage-interval option (vehicles only). */
  allowMileage?: boolean;
};

/**
 * Picker for a canonical recurrence rule string.
 *
 * Replaces the raw text input that previously required users to type
 * "every_3_months" by hand. Only ever emits strings built by `buildRule`,
 * so the picker and the rule engine cannot drift.
 */
export function RecurrencePicker({ value, onChange, allowMileage = false }: Props) {
  const parsed = parseRule(value);
  const isPreset = (PRESETS as readonly string[]).includes(value);
  const isMileage = parsed.kind === 'mileage';

  // Which dropdown row is selected: a preset, custom interval, or mileage.
  const [mode, setMode] = React.useState<string>(
    isPreset ? value : isMileage ? MILEAGE_VALUE : value === 'none' ? 'none' : CUSTOM_VALUE
  );

  const [customCount, setCustomCount] = React.useState(
    parsed.kind === 'interval' && !isPreset ? String(parsed.count) : '2'
  );
  const [customUnit, setCustomUnit] = React.useState<RecurrenceUnit>(
    parsed.kind === 'interval' ? parsed.unit : 'months'
  );
  const [miles, setMiles] = React.useState(isMileage ? String(parsed.miles) : '5000');

  function emitCustom(count: string, unit: RecurrenceUnit) {
    const n = Number(count);
    if (!Number.isFinite(n) || n < 1) return;
    onChange(buildRule({ kind: 'interval', unit, count: Math.floor(n) }));
  }

  function emitMileage(next: string) {
    const n = Number(next);
    if (!Number.isFinite(n) || n < 1) return;
    onChange(buildRule({ kind: 'mileage', miles: Math.floor(n) }));
  }

  function handleModeChange(nextMode: string | undefined) {
    if (!nextMode) return;
    setMode(nextMode);

    if (nextMode === CUSTOM_VALUE) {
      emitCustom(customCount, customUnit);
    } else if (nextMode === MILEAGE_VALUE) {
      emitMileage(miles);
    } else {
      onChange(nextMode);
    }
  }

  const modeLabel =
    mode === CUSTOM_VALUE
      ? 'Custom interval'
      : mode === MILEAGE_VALUE
        ? 'By mileage'
        : formatRecurrenceRule(mode);

  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Label htmlFor="recurrence">Repeats</Label>
        <Select
          value={{ value: mode, label: modeLabel }}
          onValueChange={(option) => handleModeChange(option?.value)}>
          <SelectTrigger>
            <SelectValue placeholder="Does not repeat" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((preset) => (
              <SelectItem key={preset} value={preset} label={formatRecurrenceRule(preset)}>
                {formatRecurrenceRule(preset)}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_VALUE} label="Custom interval">
              Custom interval
            </SelectItem>
            {allowMileage ? (
              <SelectItem value={MILEAGE_VALUE} label="By mileage">
                By mileage
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </View>

      {mode === CUSTOM_VALUE ? (
        <View className="flex-row items-end gap-3">
          <View className="w-24 gap-1.5">
            <Label htmlFor="recurrence_count">Every</Label>
            <Input
              id="recurrence_count"
              keyboardType="number-pad"
              value={customCount}
              onChangeText={(text) => {
                setCustomCount(text);
                emitCustom(text, customUnit);
              }}
            />
          </View>
          <View className="flex-1 gap-1.5">
            <Label htmlFor="recurrence_unit">Unit</Label>
            <Select
              value={{
                value: customUnit,
                label: UNIT_OPTIONS.find((u) => u.value === customUnit)?.label ?? 'Months',
              }}
              onValueChange={(option) => {
                const unit = (option?.value ?? 'months') as RecurrenceUnit;
                setCustomUnit(unit);
                emitCustom(customCount, unit);
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Months" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value} label={unit.label}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        </View>
      ) : null}

      {mode === MILEAGE_VALUE ? (
        <View className="gap-1.5">
          <Label htmlFor="recurrence_miles">Every (miles)</Label>
          <Input
            id="recurrence_miles"
            keyboardType="number-pad"
            value={miles}
            onChangeText={(text) => {
              setMiles(text);
              emitMileage(text);
            }}
          />
        </View>
      ) : null}

      <Text className="text-sm text-muted-foreground">{formatRecurrenceRule(value)}</Text>
    </View>
  );
}
