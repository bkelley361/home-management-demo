import { Stack } from 'expo-router';
import {
  BellIcon,
  CalendarIcon,
  LogOutIcon,
  MessageSquareIcon,
  MoonStarIcon,
  RotateCcwIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useThemeTransition } from '@/components/ui/theme-transition';
import { cn } from '@/lib/utils';
import { deviceCalendarProvider, type TargetCalendar } from '@/lib/calendar-sync';
import { useAuth } from '@/lib/auth';
import { isDemoMode, supabase } from '@/lib/supabase';
import { mockStore } from '@/lib/mock-supabase';
import type { CompletableReminder } from '@/lib/reminders';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import {
  areNotificationsEnabled,
  backfillCalendar,
  clearCalendarEvents,
  isCalendarSyncEnabled,
  setCalendarSyncEnabled,
  setNotificationsEnabled,
  syncReminderSideEffects,
} from '@/lib/reminder-actions';
import { cancelAllReminderNotifications, requestNotificationPermission } from '@/lib/notifications';
import { useCurrentHome } from '@/lib/use-current-home';
import { FeedbackModal } from '@/components/feedback-modal';

function SettingsSection({ title, children }: { title?: string; children: React.ReactNode }) {
  const rows = React.Children.toArray(children);
  return (
    <View className="gap-2">
      {title ? (
        <Text className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
      ) : null}
      <Card className="gap-0 overflow-hidden rounded-[32px] border-black/[0.04] p-0 shadow-sm dark:border-white/10">
        {rows.map((row, index) => (
          <React.Fragment key={index}>
            {row}
            {index < rows.length - 1 ? (
              <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
            ) : null}
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  detail,
  right,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  detail?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <View className="flex-1 flex-row items-center gap-3.5">
      <View className="size-9 items-center justify-center rounded-full bg-muted dark:bg-[#22262E]">
        <Icon as={icon} className="size-4 text-foreground" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {detail ? (
          <Text className="mt-0.5 text-xs leading-normal text-muted-foreground">{detail}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale
        activeScale={0.98}
        onPress={onPress}
        disabled={disabled}
        className={cn('flex-row items-center gap-3.5 px-5 py-4', disabled && 'opacity-50')}>
        {content}
      </PressableScale>
    );
  }

  return <View className="flex-row items-center gap-3.5 px-5 py-4">{content}</View>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { toggleTheme } = useThemeTransition();
  const { home, homeId } = useCurrentHome();
  const { user, signOut } = useAuth();

  const { data: upcomingReminders = [] } = useSupabaseQuery<CompletableReminder[]>(
    ['reminders', 'assets'],
    Boolean(homeId),
    async () => {
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('home_id', homeId!)
        .eq('status', 'upcoming');
      if (error) throw error;
      const assetIds = (reminders ?? []).flatMap((reminder) =>
        reminder.asset_id ? [reminder.asset_id] : []
      );
      const assetsResult = assetIds.length
        ? await supabase
            .from('assets')
            .select('id,asset_type,mileage')
            .eq('home_id', homeId!)
            .in('id', assetIds)
        : { data: [], error: null };
      if (assetsResult.error) throw assetsResult.error;
      const assetsById = Object.fromEntries(
        (assetsResult.data ?? []).map((asset) => [asset.id, asset])
      );
      return (reminders ?? []).map((reminder) => ({
        ...reminder,
        asset: reminder.asset_id ? (assetsById[reminder.asset_id] ?? null) : null,
      }));
    },
    [homeId]
  );

  const [calendarOn, setCalendarOn] = React.useState(false);
  const [notificationsOn, setNotificationsOn] = React.useState(false);
  const [targetCalendar, setTargetCalendar] = React.useState<TargetCalendar | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [cal, notif] = await Promise.all([isCalendarSyncEnabled(), areNotificationsEnabled()]);
      setCalendarOn(cal);
      setNotificationsOn(notif);
      if (cal) setTargetCalendar(await deviceCalendarProvider.getTargetCalendar());
    })();
  }, []);

  async function handleToggleCalendar(next: boolean) {
    setIsBusy(true);
    try {
      if (next) {
        const granted = await deviceCalendarProvider.requestAccess();
        if (!granted) return;
        const target = await deviceCalendarProvider.getTargetCalendar();
        setTargetCalendar(target);
        await setCalendarSyncEnabled(true);
        setCalendarOn(true);
        await backfillCalendar(upcomingReminders);
      } else {
        await clearCalendarEvents(upcomingReminders);
        await setCalendarSyncEnabled(false);
        setCalendarOn(false);
        setTargetCalendar(null);
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleNotifications(next: boolean) {
    setIsBusy(true);
    try {
      if (next) {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        await setNotificationsEnabled(true);
        setNotificationsOn(true);
        // Schedule for everything already on the books.
        for (const reminder of upcomingReminders) {
          await syncReminderSideEffects(reminder);
        }
      } else {
        await cancelAllReminderNotifications();
        await setNotificationsEnabled(false);
        setNotificationsOn(false);
      }
    } finally {
      setIsBusy(false);
    }
  }

  const calendarDetail = targetCalendar
    ? targetCalendar.isGoogle
      ? `Syncing to ${targetCalendar.source}`
      : `${targetCalendar.title} — on this device only`
    : undefined;

  const initials = (user?.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 100, 160),
        }}
        contentContainerClassName="gap-5 px-5 pt-14">
        <Text className="text-2xl font-semibold">Settings</Text>

        <Card className="flex-row items-center gap-4 rounded-[32px] border-black/[0.04] p-5 shadow-sm dark:border-white/10">
          <Avatar alt={user?.email ?? 'Profile'} className="size-14 rounded-full">
            <AvatarFallback className="bg-primary/10">
              <Text className="text-lg font-bold text-foreground">{initials}</Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-foreground">
                {user?.email ?? 'Signed in'}
              </Text>
              {isDemoMode && (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10">
                  <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Demo Mode
                  </Text>
                </Badge>
              )}
            </View>
            {home ? (
              <Text className="text-xs text-muted-foreground">
                {home.street}, {home.city}
              </Text>
            ) : null}
            <Badge variant="secondary" className="mt-0.5 self-start">
              <Text>Primary Residence</Text>
            </Badge>
          </View>
        </Card>

        <SettingsSection title="Appearance">
          <SettingsRow
            icon={MoonStarIcon}
            label="Dark Mode"
            right={
              <Switch checked={colorScheme === 'dark'} onCheckedChange={() => toggleTheme()} />
            }
          />
        </SettingsSection>

        <SettingsSection title="Reminders">
          <SettingsRow
            icon={CalendarIcon}
            label="Add to calendar"
            detail={calendarOn ? calendarDetail : 'Write reminders to your device calendar'}
            right={
              <Switch
                checked={calendarOn}
                disabled={isBusy}
                onCheckedChange={handleToggleCalendar}
              />
            }
          />
          <SettingsRow
            icon={BellIcon}
            label="Notifications"
            detail="Notify at 9am on the due date"
            right={
              <Switch
                checked={notificationsOn}
                disabled={isBusy}
                onCheckedChange={handleToggleNotifications}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Support & Feedback">
          <SettingsRow
            icon={MessageSquareIcon}
            label="Send Feedback"
            detail="Report an issue, suggest features, or share feedback"
            onPress={() => setFeedbackOpen(true)}
          />
        </SettingsSection>

        {isDemoMode && (
          <View className="pt-2">
            <Button
              variant="outline"
              className="h-13 w-full rounded-full border-black/[0.06] bg-card py-3.5 shadow-sm dark:border-white/10"
              onPress={() => {
                mockStore.reset();
              }}>
              <Icon as={RotateCcwIcon} className="size-4 text-foreground" />
              <Text className="font-semibold text-foreground">Reset Demo Data</Text>
            </Button>
          </View>
        )}

        <View className="pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-13 w-full rounded-full border-black/[0.06] bg-card py-3.5 shadow-sm dark:border-white/10">
                <Icon as={LogOutIcon} className="size-4 text-destructive" />
                <Text className="font-semibold text-destructive">Sign Out</Text>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign in again to access your home.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>Cancel</Text>
                </AlertDialogCancel>
                <AlertDialogAction onPress={() => void signOut()}>
                  <Text>Log Out</Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>

        <Text className="mb-4 text-center text-xs text-muted-foreground">
          Home Management v1.0.0
        </Text>
      </ScrollView>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
