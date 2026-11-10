import { router, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { FormScreen } from '@/components/ui/form-screen';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalCloseButton } from '@/components/ui/modal-close-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { nextMonthlyDueDate } from '@/lib/reminders';
import { useCurrentHome } from '@/lib/use-current-home';

const TYPE_OPTIONS = [
  { value: 'electric', label: 'Electric' },
  { value: 'gas', label: 'Gas' },
  { value: 'water', label: 'Water' },
  { value: 'sewer', label: 'Sewer' },
  { value: 'trash', label: 'Trash' },
  { value: 'internet', label: 'Internet' },
  { value: 'cell_service', label: 'Cell Service' },
  { value: 'other', label: 'Other' },
];

export default function AddUtilityProviderScreen() {
  const { homeId, profileId } = useCurrentHome();

  const [type, setType] = React.useState<string | null>(null);
  const [otherLabel, setOtherLabel] = React.useState('');
  const [providerName, setProviderName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [billDueDay, setBillDueDay] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedOption = TYPE_OPTIONS.find((option) => option.value === type);

  async function handleSubmit() {
    if (!homeId || !profileId) return;

    if (!type || !providerName.trim()) {
      setError('Please choose a type and enter the provider name.');
      return;
    }

    if (type === 'other' && !otherLabel.trim()) {
      setError('Please enter a label for this provider type.');
      return;
    }

    const dueDay = Number(billDueDay.trim());
    if (!billDueDay.trim() || Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      setError('Please enter a bill due day between 1 and 31.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('create_utility_provider_with_bill_reminder', {
        p_home_id: homeId,
        p_type: type === 'other' ? otherLabel.trim() : type,
        p_provider_name: providerName.trim(),
        p_account_number: accountNumber.trim(),
        p_website: website.trim(),
        p_bill_due_day: dueDay,
        p_next_due_date: nextMonthlyDueDate(dueDay),
      });
      if (rpcError) throw rpcError;
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Provider',
          headerShown: true,
          headerLeft: () => <ModalCloseButton />,
        }}
      />

      <FormScreen
        contentClassName="gap-6 px-5 pt-6"
        footer={
          <>
            <FormError message={error} />
            <Button onPress={handleSubmit} disabled={isSubmitting}>
              <Text>{isSubmitting ? 'Saving…' : 'Add Provider'}</Text>
            </Button>
          </>
        }>
        {/* Type section */}
        <View className="gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Type
          </Text>
          <Select value={selectedOption} onValueChange={(option) => setType(option?.value ?? null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} label={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === 'other' ? (
            <View className="gap-1.5 pt-1">
              <Label htmlFor="other_label">Provider type label</Label>
              <Input
                id="other_label"
                placeholder="HOA, security monitoring, propane…"
                value={otherLabel}
                onChangeText={setOtherLabel}
              />
            </View>
          ) : null}
        </View>

        {/* Provider details section */}
        <View className="gap-3 pt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Provider details
          </Text>
          <View className="gap-1.5">
            <Label htmlFor="provider_name">Provider name</Label>
            <Input id="provider_name" value={providerName} onChangeText={setProviderName} />
          </View>
          <View className="gap-1.5">
            <Label htmlFor="account_number">Account number (optional)</Label>
            <Input id="account_number" value={accountNumber} onChangeText={setAccountNumber} />
          </View>
          <View className="gap-1.5">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              autoCapitalize="none"
              placeholder="https://..."
              value={website}
              onChangeText={setWebsite}
            />
          </View>
          <View className="gap-1.5">
            <Label htmlFor="bill_due_day">Bill due day of month</Label>
            <Input
              id="bill_due_day"
              placeholder="15"
              keyboardType="number-pad"
              value={billDueDay}
              onChangeText={setBillDueDay}
            />
          </View>
        </View>
      </FormScreen>
    </>
  );
}
