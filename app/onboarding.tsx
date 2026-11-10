import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';

import { AddressStep, type Address } from '@/components/onboarding/address-step';
import { IntroStep } from '@/components/onboarding/intro-step';
import { PropertyTypeStep, type PropertyType } from '@/components/onboarding/property-type-step';
import { SepticPumpStep } from '@/components/onboarding/septic-pump-step';
import { SprinklersStep } from '@/components/onboarding/sprinklers-step';
import { WasteStep, type WasteSystem } from '@/components/onboarding/waste-step';
import { WaterStep, type WaterSource } from '@/components/onboarding/water-step';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCurrentHome } from '@/lib/use-current-home';

const ALL_STEPS = [
  'intro',
  'address',
  'property-type',
  'water',
  'waste',
  'septic-pump',
  'sprinklers',
] as const;

type Step = (typeof ALL_STEPS)[number];

const SEPTIC_PUMP_INTERVAL_YEARS = 3;

type FormData = {
  address: Address;
  propertyType: PropertyType | null;
  waterSource: WaterSource | null;
  wasteSystem: WasteSystem | null;
  lastSepticPumpDate: string | null;
  hasSprinklers: boolean | null;
};

const INITIAL_FORM_DATA: FormData = {
  address: { street: '', city: '', state: '', zip: '' },
  propertyType: null,
  waterSource: null,
  wasteSystem: null,
  lastSepticPumpDate: null,
  hasSprinklers: null,
};

export default function OnboardingScreen() {
  const { user } = useAuth();
  const { refresh: refreshCurrentHome } = useCurrentHome();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [formData, setFormData] = React.useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const steps = React.useMemo<Step[]>(
    () => ALL_STEPS.filter((step) => step !== 'septic-pump' || formData.wasteSystem === 'septic'),
    [formData.wasteSystem]
  );
  const step: Step = steps[stepIndex];

  function goNext() {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  async function handleSubmit() {
    if (!user || formData.hasSprinklers === null) return;

    const { address, propertyType, waterSource, wasteSystem, lastSepticPumpDate, hasSprinklers } =
      formData;
    setIsSubmitting(true);
    setError(null);

    try {
      let septicReminderDueDate: number | null = null;
      if (wasteSystem === 'septic' && lastSepticPumpDate) {
        const dueDate = new Date(lastSepticPumpDate);
        dueDate.setFullYear(dueDate.getFullYear() + SEPTIC_PUMP_INTERVAL_YEARS);
        septicReminderDueDate = dueDate.getTime();
      }

      const { error: rpcError } = await supabase.rpc('create_onboarding_home', {
        p_street: address.street.trim(),
        p_city: address.city.trim(),
        p_state: address.state.trim(),
        p_zip: address.zip.trim(),
        p_property_type: propertyType!,
        p_water_source: waterSource!,
        p_waste_system: wasteSystem!,
        p_has_sprinklers: hasSprinklers,
        p_septic_reminder_due_date: septicReminderDueDate ?? undefined,
      });
      if (rpcError) throw rpcError;
      refreshCurrentHome();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ flexGrow: 1 }}
        contentClassName="items-center justify-center p-6">
        <View className="w-full max-w-sm gap-4">
          <Progress value={((stepIndex + 1) / steps.length) * 100} />
          {step === 'intro' && <IntroStep onNext={goNext} />}
          {step === 'address' && (
            <AddressStep
              value={formData.address}
              onChange={(address) => setFormData((form) => ({ ...form, address }))}
              onNext={goNext}
            />
          )}
          {step === 'property-type' && (
            <PropertyTypeStep
              value={formData.propertyType}
              onChange={(propertyType) => setFormData((form) => ({ ...form, propertyType }))}
              onNext={goNext}
            />
          )}
          {step === 'water' && (
            <WaterStep
              value={formData.waterSource}
              onChange={(waterSource) => setFormData((form) => ({ ...form, waterSource }))}
              onNext={goNext}
            />
          )}
          {step === 'waste' && (
            <WasteStep
              value={formData.wasteSystem}
              onChange={(wasteSystem) => setFormData((form) => ({ ...form, wasteSystem }))}
              onNext={goNext}
            />
          )}
          {step === 'septic-pump' && (
            <SepticPumpStep
              value={formData.lastSepticPumpDate}
              onChange={(lastSepticPumpDate) =>
                setFormData((form) => ({ ...form, lastSepticPumpDate }))
              }
              onNext={goNext}
            />
          )}
          {step === 'sprinklers' && (
            <SprinklersStep
              value={formData.hasSprinklers}
              onChange={(hasSprinklers) => setFormData((form) => ({ ...form, hasSprinklers }))}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              error={error}
            />
          )}
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}
