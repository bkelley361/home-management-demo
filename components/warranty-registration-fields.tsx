import * as React from 'react';
import { View } from 'react-native';

import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';
import { Text } from '@/components/ui/text';

export const REGISTRATION_STATUSES = [
  { value: 'not_registered', label: 'Not registered' },
  { value: 'registered', label: 'Registered' },
  { value: 'not_applicable', label: "Doesn't apply" },
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]['value'];

/**
 * Warranty + purchase + product-registration fields.
 *
 * Shared by the appliance and vehicle edit screens, which need an identical
 * block — the fields live on both entities with the same names.
 *
 * Purely presentational: the parent owns all state and the save transaction.
 * Amounts are handled as raw input strings here and converted by the parent via
 * lib/money.ts, so this component never has to know about cents.
 */
export type WarrantyRegistrationValues = {
  warrantyExpiresAt?: string;
  purchaseDate?: string;
  purchasePrice: string;
  registrationStatus: RegistrationStatus | null;
  registeredAt?: string;
  registrationConfirmation: string;
};

type Props = {
  values: WarrantyRegistrationValues;
  onChange: <K extends keyof WarrantyRegistrationValues>(
    key: K,
    value: WarrantyRegistrationValues[K]
  ) => void;
  /** Shown in the purchase card's description, e.g. 'appliance' or 'vehicle'. */
  assetNoun: string;
};

export function WarrantyRegistrationFields({ values, onChange, assetNoun }: Props) {
  return (
    <>
      {/* Purchase Section */}
      <View className="gap-3 pt-2">
        <View className="gap-0.5">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Purchase
          </Text>
          <Text className="text-xs text-muted-foreground">
            When you bought this {assetNoun}, and for how much.
          </Text>
        </View>
        <View className="gap-3">
          <View className="gap-1.5">
            <Label htmlFor="purchase_price">Purchase price (optional)</Label>
            <Input
              id="purchase_price"
              placeholder="1200.00"
              keyboardType="decimal-pad"
              value={values.purchasePrice}
              onChangeText={(text) => onChange('purchasePrice', text)}
            />
          </View>
          <View className="gap-1.5">
            <Label>Purchase date (optional)</Label>
            <Calendar
              mode="single"
              date={values.purchaseDate}
              onChange={({ date }) => date && onChange('purchaseDate', String(date))}
            />
          </View>
        </View>
      </View>

      {/* Warranty Section */}
      <View className="gap-3 pt-2">
        <View className="gap-0.5">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Warranty
          </Text>
          <Text className="text-xs text-muted-foreground">
            Set an expiry date and we&apos;ll offer a reminder before it lapses.
          </Text>
        </View>
        <Calendar
          mode="single"
          date={values.warrantyExpiresAt}
          onChange={({ date }) => date && onChange('warrantyExpiresAt', String(date))}
        />
      </View>

      {/* Product Registration Section */}
      <View className="gap-3 pt-2">
        <View className="gap-0.5">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Product registration
          </Text>
          <Text className="text-xs text-muted-foreground">
            Registering with the manufacturer is often what makes the warranty claimable.
          </Text>
        </View>
        <RadioGroup
          value={values.registrationStatus ?? undefined}
          onValueChange={(next) => onChange('registrationStatus', next as RegistrationStatus)}>
          {REGISTRATION_STATUSES.map((option) => (
            <RadioOption
              key={option.value}
              value={option.value}
              label={option.label}
              nativeID={`registration-status-${option.value}`}
              onSelect={() => onChange('registrationStatus', option.value)}
            />
          ))}
        </RadioGroup>

        {/* Only meaningful once they've actually registered. */}
        {values.registrationStatus === 'registered' ? (
          <View className="gap-3 pt-1">
            <View className="gap-1.5">
              <Label htmlFor="registration_confirmation">Confirmation number (optional)</Label>
              <Input
                id="registration_confirmation"
                value={values.registrationConfirmation}
                onChangeText={(text) => onChange('registrationConfirmation', text)}
              />
            </View>
            <View className="gap-1.5">
              <Label>Date registered (optional)</Label>
              <Calendar
                mode="single"
                date={values.registeredAt}
                onChange={({ date }) => date && onChange('registeredAt', String(date))}
              />
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}
