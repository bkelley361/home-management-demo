import { router, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormError } from '@/components/ui/form-error';
import { FormScreen } from '@/components/ui/form-screen';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalCloseButton } from '@/components/ui/modal-close-button';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';
import { RecurrencePicker } from '@/components/ui/recurrence-picker';
import { Text } from '@/components/ui/text';
import type { Tables, TablesInsert } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import { parseRule } from '@/lib/recurrence';
import { useCurrentHome } from '@/lib/use-current-home';

type LinkType = 'none' | 'asset' | 'utility_provider';

type ReminderAsset = Tables<'assets'>;

export default function AddReminderScreen() {
  const { homeId, profileId } = useCurrentHome();

  const { data } = useSupabaseQuery<{
    assets: ReminderAsset[];
    providers: Tables<'utility_providers'>[];
  }>(
    ['assets', 'utility_providers'],
    !!homeId,
    async () => {
      const [assetsResult, providersResult] = await Promise.all([
        supabase.from('assets').select('*').eq('home_id', homeId!),
        supabase.from('utility_providers').select('*').eq('home_id', homeId!),
      ]);
      const error = assetsResult.error ?? providersResult.error;
      if (error) throw error;
      return {
        assets: assetsResult.data ?? [],
        providers: providersResult.data ?? [],
      };
    },
    [homeId]
  );

  const assets = data?.assets ?? [];
  const providers = data?.providers ?? [];
  const [title, setTitle] = React.useState('');
  const [recurrenceRule, setRecurrenceRule] = React.useState('none');
  const [dueDate, setDueDate] = React.useState<string | undefined>(undefined);
  const [linkType, setLinkType] = React.useState<LinkType>('none');
  const [linkId, setLinkId] = React.useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const linkOptions =
    linkType === 'asset'
      ? assets.map((asset) => ({
          id: asset.id,
          label:
            asset.asset_type === 'vehicle'
              ? `${asset.year} ${asset.make} ${asset.model}`
              : (asset.name ?? 'Unnamed item'),
        }))
      : linkType === 'utility_provider'
        ? providers.map((provider) => ({ id: provider.id, label: provider.provider_name }))
        : [];
  async function handleSubmit() {
    if (!homeId || !profileId) return;

    if (!title.trim() || !dueDate) {
      setError('Please enter a title and due date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const linkedAsset =
        linkType === 'asset' && linkId ? assets.find((asset) => asset.id === linkId) : undefined;
      const parsedRule = parseRule(recurrenceRule);
      const dueMileage =
        parsedRule.kind === 'mileage' &&
        linkedAsset?.asset_type === 'vehicle' &&
        linkedAsset.mileage !== null
          ? linkedAsset.mileage + parsedRule.miles
          : null;
      const row: TablesInsert<'reminders'> = {
        home_id: homeId,
        created_by_id: profileId,
        title: title.trim(),
        recurrence_rule: recurrenceRule,
        due_date: new Date(dueDate).getTime(),
        due_mileage: dueMileage,
        status: 'upcoming',
        source: 'manual',
        asset_id: linkType === 'asset' ? linkId : null,
        utility_provider_id: linkType === 'utility_provider' ? linkId : null,
      };
      const { error } = await supabase.from('reminders').insert(row);
      if (error) throw error;
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Reminder',
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
              <Text>{isSubmitting ? 'Saving…' : 'Add Reminder'}</Text>
            </Button>
          </>
        }>
        {/* Reminder details section */}
        <View className="gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Reminder details
          </Text>
          <View className="gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Replace furnace filter"
              value={title}
              onChangeText={setTitle}
            />
          </View>
          <RecurrencePicker
            value={recurrenceRule}
            onChange={setRecurrenceRule}
            allowMileage={
              linkType === 'asset' &&
              assets.find((asset) => asset.id === linkId)?.asset_type === 'vehicle'
            }
          />
        </View>

        {/* Due date section */}
        <View className="gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Due date
          </Text>
          <Calendar
            mode="single"
            date={dueDate}
            onChange={({ date }) => date && setDueDate(String(date))}
          />
        </View>

        {/* Link to section */}
        <View className="gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Link to (optional)
          </Text>
          <RadioGroup
            value={linkType}
            onValueChange={(v) => {
              setLinkType(v as LinkType);
              setLinkId(null);
              setRecurrenceRule('none');
            }}>
            <RadioOption
              value="none"
              label="Nothing"
              nativeID="reminder-link-none"
              onSelect={() => {
                setLinkType('none');
                setLinkId(null);
                setRecurrenceRule('none');
              }}
            />
            <RadioOption
              value="asset"
              label="An asset"
              nativeID="reminder-link-asset"
              onSelect={() => {
                setLinkType('asset');
                setLinkId(null);
                setRecurrenceRule('none');
              }}
            />
            <RadioOption
              value="utility_provider"
              label="A provider"
              nativeID="reminder-link-utility-provider"
              onSelect={() => {
                setLinkType('utility_provider');
                setLinkId(null);
                setRecurrenceRule('none');
              }}
            />
          </RadioGroup>

          {linkType !== 'none' && linkOptions.length > 0 ? (
            <RadioGroup value={linkId ?? undefined} onValueChange={setLinkId}>
              {linkOptions.map((option) => (
                <RadioOption
                  key={option.id}
                  value={option.id}
                  label={option.label}
                  nativeID={`reminder-link-item-${option.id}`}
                  onSelect={() => {
                    setLinkId(option.id);
                    setRecurrenceRule('none');
                  }}
                />
              ))}
            </RadioGroup>
          ) : null}
        </View>
      </FormScreen>
    </>
  );
}
