import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import * as React from 'react';
import { BackHandler, View } from 'react-native';

import { ScreenBackButton } from '@/components/ui/screen-back-button';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormScreen } from '@/components/ui/form-screen';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RecurrencePicker } from '@/components/ui/recurrence-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import {
  addReminderToCalendar,
  completeReminder,
  deleteReminder,
  removeReminderFromCalendar,
  snoozeReminder,
  updateReminderSchedule,
} from '@/lib/reminder-actions';

import { useCurrentHome } from '@/lib/use-current-home';
import { formatRecurrenceRule, isMileageRule, isOverdue } from '@/lib/reminders';

type ReminderDetails = Tables<'reminders'> & {
  asset?: Pick<
    Tables<'assets'>,
    'id' | 'asset_type' | 'name' | 'mileage' | 'year' | 'make' | 'model' | 'brand' | 'model_number'
  > | null;
  utility_provider?: Pick<Tables<'utility_providers'>, 'id' | 'provider_name'> | null;
  part?: Pick<Tables<'parts'>, 'id' | 'part_name'> | null;
};
const DAY_MS = 24 * 60 * 60 * 1000;

const SNOOZE_OPTIONS = [
  { label: '3 days', ms: 3 * DAY_MS },
  { label: '1 week', ms: 7 * DAY_MS },
  { label: '1 month', ms: 30 * DAY_MS },
];

export default function ReminderDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const navigation = useNavigation();
  const { homeId } = useCurrentHome();

  // When opened from Dashboard, ensure reminder is at the root of the reminders stack
  // so prior reminders or screens don't accumulate in the back stack.
  React.useEffect(() => {
    if (from === 'dashboard') {
      const state = navigation.getState();
      if (!state?.routes) return;
      if (state.routes.length > 1) {
        const currentRoute = state.routes[state.routes.length - 1];
        navigation.reset({
          index: 0,
          routes: [currentRoute] as any,
        });
      }
    }
  }, [from, id, navigation]);

  // Handle Android hardware back press when opened from dashboard:
  // reset reminders stack to root 'index' and return to dashboard.
  React.useEffect(() => {
    if (from !== 'dashboard') return;
    const onBackPress = () => {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'index' }] as any,
        });
      } catch {}
      const parent = navigation.getParent();
      if (parent?.canGoBack()) {
        parent.goBack();
      } else {
        router.replace('/');
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [from, navigation]);
  const { data } = useSupabaseQuery<ReminderDetails | null>(
    ['reminders', 'assets', 'utility_providers', 'parts'],
    !!id && !!homeId,
    async () => {
      const { data: reminder, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', id)
        .eq('home_id', homeId!)
        .maybeSingle();
      if (error) throw error;
      if (!reminder) return null;

      const [assetResult, providerResult, partResult] = await Promise.all([
        reminder.asset_id
          ? supabase
              .from('assets')
              .select('id,asset_type,name,mileage,year,make,model,brand,model_number')
              .eq('id', reminder.asset_id)
              .eq('home_id', homeId!)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        reminder.utility_provider_id
          ? supabase
              .from('utility_providers')
              .select('id,provider_name')
              .eq('id', reminder.utility_provider_id)
              .eq('home_id', homeId!)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        reminder.part_id
          ? supabase
              .from('parts')
              .select('id,part_name')
              .eq('id', reminder.part_id)
              .eq('home_id', homeId!)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      const relationsError = assetResult.error ?? providerResult.error ?? partResult.error;
      if (relationsError) throw relationsError;
      return {
        ...reminder,
        asset: assetResult.data,
        utility_provider: providerResult.data,
        part: partResult.data,
      };
    },
    [id, homeId]
  );
  const reminder = data;

  const [dueDate, setDueDate] = React.useState<string | undefined>(undefined);
  const [rule, setRule] = React.useState<string | null>(null);
  const [mileage, setMileage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    if (reminder && rule === null) {
      setRule(reminder.recurrence_rule);
      setDueDate(new Date(reminder.due_date).toISOString());
    }
  }, [reminder, rule]);

  if (!reminder || rule === null) {
    return (
      <FormScreen>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </FormScreen>
    );
  }

  const overdue = isOverdue(reminder);
  const isSnoozed = reminder.status === 'snoozed';
  const isDone = reminder.status === 'completed';
  const needsMileage =
    isMileageRule(reminder.recurrence_rule) && reminder.asset?.asset_type === 'vehicle';
  const hasCalendarEvent = !!reminder.calendar_event_id;

  const linkLabel = reminder.asset
    ? reminder.asset.asset_type === 'vehicle'
      ? `${reminder.asset.year} ${reminder.asset.make} ${reminder.asset.model}`
      : [reminder.asset.name, reminder.asset.brand, reminder.asset.model_number]
          .filter(Boolean)
          .join(' · ')
    : reminder.utility_provider
      ? reminder.utility_provider.provider_name
      : reminder.part
        ? reminder.part.part_name
        : null;

  const scheduleChanged =
    rule !== reminder.recurrence_rule ||
    (dueDate ? new Date(dueDate).getTime() !== reminder.due_date : false);

  async function handleSaveSchedule() {
    if (!reminder) return;
    setIsSaving(true);
    try {
      await updateReminderSchedule(reminder, {
        recurrence_rule: rule!,
        due_date: dueDate ? new Date(dueDate).getTime() : reminder!.due_date,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete() {
    if (!reminder) return;
    setIsBusy(true);
    try {
      const parsed = Number(mileage);
      await completeReminder(reminder, {
        currentMileage: needsMileage && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
      });
      router.back();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSnooze(ms: number) {
    if (!reminder) return;
    setIsBusy(true);
    try {
      await snoozeReminder(reminder, Date.now() + ms);
      router.back();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleCalendar(next: boolean) {
    if (!reminder) return;
    setIsBusy(true);
    try {
      if (next) await addReminderToCalendar(reminder);
      else await removeReminderFromCalendar(reminder);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!reminder) return;
    await deleteReminder(reminder);
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reminder',
          headerShown: true,
          headerLeft: () => (
            <ScreenBackButton fallbackHref={from === 'dashboard' ? '/' : '/reminders'} />
          ),
        }}
      />

      <FormScreen>
        <Card className="pb-4">
          <CardHeader className="gap-2">
            <CardTitle>{reminder.title}</CardTitle>
            <View className="flex-row flex-wrap items-center gap-2">
              {overdue ? (
                <Badge variant="destructive">
                  <Text>Overdue</Text>
                </Badge>
              ) : null}
              {isSnoozed ? (
                <Badge variant="secondary">
                  <Text>Snoozed</Text>
                </Badge>
              ) : null}
              {isDone ? (
                <Badge variant="secondary">
                  <Text>Completed</Text>
                </Badge>
              ) : null}
              {linkLabel ? (
                <Badge variant="outline">
                  <Text>{linkLabel}</Text>
                </Badge>
              ) : null}
            </View>
            <CardDescription>
              Due {new Date(reminder.due_date).toLocaleDateString()} ·{' '}
              {formatRecurrenceRule(reminder.recurrence_rule)}
              {reminder.due_mileage ? ` · at ${reminder.due_mileage.toLocaleString()} mi` : ''}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="pb-4">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1">Add to my calendar</Text>
              <Switch
                checked={hasCalendarEvent}
                disabled={isBusy}
                onCheckedChange={handleToggleCalendar}
              />
            </View>
          </CardContent>
        </Card>

        <Card className="pb-4">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <RecurrencePicker
              value={rule}
              onChange={setRule}
              allowMileage={reminder.asset?.asset_type === 'vehicle'}
            />
            <Calendar
              mode="single"
              date={dueDate}
              onChange={({ date }) => date && setDueDate(String(date))}
            />
            {scheduleChanged ? (
              <Button onPress={handleSaveSchedule} disabled={isSaving}>
                <Text>{isSaving ? 'Saving…' : 'Save schedule'}</Text>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {!isDone ? (
          <>
            <Card className="pb-4">
              <CardHeader className="gap-2">
                <CardTitle>Mark complete</CardTitle>
                {needsMileage ? (
                  <CardDescription>
                    Enter the current odometer reading so the next interval is accurate.
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="gap-3">
                {needsMileage ? (
                  <View className="gap-1.5">
                    <Label htmlFor="mileage">Current mileage</Label>
                    <Input
                      id="mileage"
                      keyboardType="number-pad"
                      placeholder={String(reminder.asset?.mileage ?? '')}
                      value={mileage}
                      onChangeText={setMileage}
                    />
                  </View>
                ) : null}
                <Button onPress={handleComplete} disabled={isBusy}>
                  <Text>Complete</Text>
                </Button>
              </CardContent>
            </Card>

            <Card className="pb-4">
              <CardHeader>
                <CardTitle>Snooze</CardTitle>
              </CardHeader>
              <CardContent className="flex-row flex-wrap gap-2">
                {SNOOZE_OPTIONS.map((option) => (
                  <Button
                    key={option.label}
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onPress={() => handleSnooze(option.ms)}>
                    <Text>{option.label}</Text>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Text>Delete Reminder</Text>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{reminder.title}&quot; and its calendar event will be removed. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Text>Cancel</Text>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleDelete}>
                <Text>Delete</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </FormScreen>
    </>
  );
}
