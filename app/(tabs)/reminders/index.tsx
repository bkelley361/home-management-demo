import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from 'react-native-reanimated';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import { completeReminder, undoCompleteReminder, unsnoozeReminder } from '@/lib/reminder-actions';
import { endOfDay, formatRecurrenceRule, startOfDay } from '@/lib/reminders';
import { useCurrentHome } from '@/lib/use-current-home';
import { cn } from '@/lib/utils';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

type TabKey = 'month' | 'upcoming' | 'overdue';

type Reminder = Tables<'reminders'> & {
  asset?: Pick<Tables<'assets'>, 'id' | 'asset_type' | 'mileage'> | null;
};

function toDateKey(dateOrTime: number | Date): string {
  const d = new Date(dateOrTime);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RemindersScreen() {
  const { homeId } = useCurrentHome();
  const searchParams = useLocalSearchParams<{ tab?: string }>();

  const { data, isLoading } = useSupabaseQuery<Reminder[]>(
    ['reminders', 'assets'],
    !!homeId,
    async () => {
      const [remindersResult, assetsResult] = await Promise.all([
        supabase.from('reminders').select('*').eq('home_id', homeId!).order('due_date'),
        supabase.from('assets').select('id,asset_type,mileage').eq('home_id', homeId!),
      ]);
      const error = remindersResult.error ?? assetsResult.error;
      if (error) throw error;
      const assetsById = Object.fromEntries(
        (assetsResult.data ?? []).map((asset) => [asset.id, asset])
      );
      return (remindersResult.data ?? []).map((reminder) => ({
        ...reminder,
        asset: reminder.asset_id ? (assetsById[reminder.asset_id] ?? null) : null,
      }));
    },
    [homeId]
  );
  const reminders = data ?? [];

  return (
    <RemindersView
      reminders={reminders}
      isLoading={isLoading && !data}
      initialTab={
        searchParams.tab === 'overdue'
          ? 'overdue'
          : searchParams.tab === 'upcoming'
            ? 'upcoming'
            : searchParams.tab === 'month'
              ? 'month'
              : undefined
      }
    />
  );
}

function RemindersView({
  reminders,
  isLoading,
  initialTab,
}: {
  reminders: Reminder[];
  isLoading: boolean;
  initialTab?: TabKey;
}) {
  const now = new Date();
  const todayStart = startOfDay();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

  const [showHistory, setShowHistory] = React.useState(false);

  const active = reminders.filter(
    (r) =>
      r.status === 'upcoming' || (r.status === 'snoozed' && (r.snoozed_until ?? 0) <= Date.now())
  );
  const completed = reminders
    .filter((r) => r.status === 'completed')
    .sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0));

  const expiredSnoozes = reminders.filter(
    (r) => r.status === 'snoozed' && (r.snoozed_until ?? 0) <= Date.now()
  );

  React.useEffect(() => {
    expiredSnoozes.forEach((reminder) => {
      void unsnoozeReminder(reminder);
    });
  }, [expiredSnoozes.map((r) => r.id).join(',')]);

  // Buckets: This Month, Upcoming, Overdue
  const dueThisMonth = active.filter((r) => r.due_date >= todayStart && r.due_date <= monthEnd);
  const upcomingFuture = active.filter((r) => r.due_date > monthEnd);
  const overdue = active.filter((r) => r.due_date < todayStart);

  const defaultTab: TabKey = initialTab ?? 'month';
  const [tab, setTab] = React.useState<TabKey>(defaultTab);

  React.useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  // Completion dialog state
  const [target, setTarget] = React.useState<Reminder | null>(null);
  const [stage, setStage] = React.useState<'none' | 'early-warning' | 'confirm'>('none');

  function openFlow(reminder: Reminder) {
    setTarget(reminder);
    setStage(reminder.due_date - Date.now() > TEN_DAYS_MS ? 'early-warning' : 'confirm');
  }

  function closeFlow() {
    setStage('none');
    setTarget(null);
  }

  async function confirmComplete() {
    if (!target) return;
    try {
      await completeReminder(target);
    } catch (err) {
      console.error('Error completing reminder:', err);
    } finally {
      closeFlow();
    }
  }

  const daysUntilDue = target
    ? Math.round((target.due_date - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Reminders' }} />

      <View className="flex-1 bg-background px-5 pt-14">
        {/* Top Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text className="text-3xl font-bold tracking-tight text-foreground">Reminders</Text>
            <Text className="text-xs font-medium text-muted-foreground">
              {active.length} active task{active.length === 1 ? '' : 's'}
              {overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {completed.length > 0 && (
              <Button
                size="sm"
                variant={showHistory ? 'default' : 'outline'}
                onPress={() => setShowHistory((prev) => !prev)}
                className="shadow-xs rounded-full">
                <Icon as={History} className="size-4" />
                <Text>{showHistory ? 'Tasks' : 'History'}</Text>
              </Button>
            )}
            <Link href="/reminders/add" asChild>
              <Button size="sm" className="rounded-full shadow-sm">
                <Icon as={Plus} className="size-4" />
              </Button>
            </Link>
          </View>
        </View>

        {isLoading ? (
          <EmptyState message="Loading reminders..." />
        ) : showHistory ? (
          <HistoryList reminders={completed} />
        ) : active.length === 0 ? (
          <EmptyState message="No active reminders. Tap + to add one." />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1">
            {/* Tabs order left to right: This Month, Upcoming, Overdue */}
            <TabsList className="w-full">
              <TabsTrigger
                value="month"
                className="flex-1 flex-row items-center justify-center gap-1.5">
                <Text className="text-xs font-semibold">This Month</Text>
                {dueThisMonth.length > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 items-center justify-center px-1.5 py-0">
                    <Text className="text-[10px] font-bold">{dueThisMonth.length}</Text>
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="flex-1 flex-row items-center justify-center gap-1.5">
                <Text className="text-xs font-semibold">Upcoming</Text>
                {upcomingFuture.length > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 items-center justify-center px-1.5 py-0">
                    <Text className="text-[10px] font-bold">{upcomingFuture.length}</Text>
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="overdue"
                className="flex-1 flex-row items-center justify-center gap-1.5">
                <Text className="text-xs font-semibold">Overdue</Text>
                {overdue.length > 0 ? (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 items-center justify-center px-1.5 py-0">
                    <Text className="text-[10px] font-bold">{overdue.length}</Text>
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="flex-1">
              <MonthViewWithCalendar
                dueThisMonth={dueThisMonth}
                allActive={active}
                onComplete={openFlow}
              />
            </TabsContent>
            <TabsContent value="upcoming" className="flex-1">
              <SimpleReminderList
                reminders={upcomingFuture}
                emptyMessage="No upcoming tasks beyond this month."
                onComplete={openFlow}
              />
            </TabsContent>
            <TabsContent value="overdue" className="flex-1">
              <SimpleReminderList
                reminders={overdue}
                emptyMessage="No overdue tasks. All caught up!"
                onComplete={openFlow}
              />
            </TabsContent>
          </Tabs>
        )}
      </View>

      <AlertDialog open={stage === 'early-warning'} onOpenChange={(open) => !open && closeFlow()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This isn't due yet</AlertDialogTitle>
            <AlertDialogDescription>
              "{target?.title}" isn't due for {daysUntilDue} more day{daysUntilDue === 1 ? '' : 's'}
              . Mark it complete anyway? You can undo this for 3 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={closeFlow}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmComplete}>
              <Text>Complete anyway</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={stage === 'confirm'} onOpenChange={(open) => !open && closeFlow()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              "{target?.title}" will move to your history. You can undo this for 3 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={closeFlow}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmComplete}>
              <Text>Complete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ReminderCardItem({
  reminder,
  onComplete,
}: {
  reminder: Reminder;
  onComplete: (reminder: Reminder) => void;
}) {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const isLate = reminder.due_date < todayStart;
  const isToday = reminder.due_date >= todayStart && reminder.due_date <= todayEnd;
  const daysOverdue = Math.max(
    1,
    Math.floor((Date.now() - reminder.due_date) / (24 * 60 * 60 * 1000))
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      entering={FadeInDown.duration(200).springify().damping(18)}
      exiting={FadeOutLeft.duration(180)}>
      <PressableScale
        activeScale={0.98}
        onPress={() => router.push(`/reminders/${reminder.id}`)}
        className="flex-row items-center justify-between rounded-[22px] border border-black/[0.04] bg-card p-3.5 shadow-sm dark:border-white/10">
        <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
          <PressableScale
            activeScale={0.88}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onComplete(reminder);
            }}
            className="size-8 items-center justify-center rounded-full border border-black/15 bg-muted/40 hover:bg-primary/20 dark:border-white/20"
            accessibilityLabel={`Complete ${reminder.title}`}>
            <Icon as={Check} className="size-4 text-muted-foreground" />
          </PressableScale>

          <View className="min-w-0 flex-1 justify-center gap-0.5">
            <Text
              className="text-base font-semibold leading-snug text-foreground"
              numberOfLines={1}>
              {reminder.title}
            </Text>
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text
                className={cn(
                  'text-xs font-medium',
                  isLate ? 'font-semibold text-destructive' : 'text-muted-foreground'
                )}>
                {isToday
                  ? 'Due Today'
                  : isLate
                    ? `${daysOverdue}d overdue`
                    : `Due ${new Date(reminder.due_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}`}
              </Text>
              {reminder.recurrence_rule && reminder.recurrence_rule !== 'none' && (
                <Text className="text-xs text-muted-foreground/70">
                  · {formatRecurrenceRule(reminder.recurrence_rule)}
                </Text>
              )}
              {reminder.due_mileage ? (
                <Text className="text-xs text-muted-foreground/70">
                  · {reminder.due_mileage.toLocaleString()} mi
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View className="shrink-0 flex-row items-center gap-2">
          {isLate ? (
            <Badge variant="destructive" className="px-2 py-0.5">
              <Text className="text-[10px] font-bold">{daysOverdue}d late</Text>
            </Badge>
          ) : isToday ? (
            <Badge variant="default" className="bg-[#EFF0A3] px-2 py-0.5 dark:bg-[#EFF0A3]">
              <Text className="text-[10px] font-bold text-[#1C1D00]">Today</Text>
            </Badge>
          ) : null}
          <Icon as={ChevronRight} className="size-4 text-muted-foreground/50" />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function SimpleReminderList({
  reminders,
  emptyMessage,
  onComplete,
}: {
  reminders: Reminder[];
  emptyMessage: string;
  onComplete: (reminder: Reminder) => void;
}) {
  if (reminders.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-2.5 pb-24 pt-3">
      {reminders.map((reminder) => (
        <ReminderCardItem key={reminder.id} reminder={reminder} onComplete={onComplete} />
      ))}
    </ScrollView>
  );
}

function MonthViewWithCalendar({
  dueThisMonth,
  allActive,
  onComplete,
}: {
  dueThisMonth: Reminder[];
  allActive: Reminder[];
  onComplete: (reminder: Reminder) => void;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = React.useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Days in month calculation
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Map active reminders by dateKey
  const remindersByDate = React.useMemo(() => {
    const map = new Map<string, Reminder[]>();
    allActive.forEach((r) => {
      const key = toDateKey(r.due_date);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    });
    return map;
  }, [allActive]);

  const selectedDateKey = toDateKey(selectedDate);
  const tasksForSelectedDate = remindersByDate.get(selectedDateKey) ?? [];

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedDateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  function changeMonth(delta: number) {
    setViewDate(new Date(viewYear, viewMonth + delta, 1));
  }

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <ScrollView contentContainerClassName="gap-5 pb-28 pt-3">
      {/* 1. Items this month listed above the calendar view */}
      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Due in {viewDate.toLocaleDateString(undefined, { month: 'long' })} (
            {dueThisMonth.length})
          </Text>
        </View>

        {dueThisMonth.length === 0 ? (
          <View className="items-center justify-center rounded-[22px] border border-black/[0.04] bg-muted/40 p-4 dark:border-white/10 dark:bg-[#1A1D23]/40">
            <Text className="text-sm font-medium text-muted-foreground">
              No tasks due in this calendar window.
            </Text>
          </View>
        ) : (
          dueThisMonth.map((reminder) => (
            <ReminderCardItem key={reminder.id} reminder={reminder} onComplete={onComplete} />
          ))
        )}
      </View>

      {/* 2. Calendar View with highlighted days */}
      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Schedule & Day View
        </Text>
        <View className="gap-3 rounded-[28px] border border-black/[0.04] bg-card p-4 shadow-sm dark:border-white/10">
          {/* Calendar Month Navigation Header */}
          <View className="flex-row items-center justify-between pb-1">
            <Text className="text-base font-bold text-foreground">{monthLabel}</Text>
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => changeMonth(-1)}
                className="size-8 items-center justify-center rounded-full bg-muted active:opacity-70 dark:bg-[#22262E]"
                accessibilityLabel="Previous month">
                <Icon as={ChevronLeft} size={16} className="text-foreground" />
              </Pressable>
              <Pressable
                onPress={() => changeMonth(1)}
                className="size-8 items-center justify-center rounded-full bg-muted active:opacity-70 dark:bg-[#22262E]"
                accessibilityLabel="Next month">
                <Icon as={ChevronRight} size={16} className="text-foreground" />
              </Pressable>
            </View>
          </View>

          {/* Weekday Labels Header */}
          <View className="flex-row justify-between">
            {daysOfWeek.map((day, idx) => (
              <View key={idx} className="w-10 items-center justify-center">
                <Text className="text-[11px] font-bold text-muted-foreground">{day}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View className="flex-row flex-wrap">
            {/* Blank offset cells before day 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} className="h-11 w-[14.28%] items-center justify-center" />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(viewYear, viewMonth, dayNum);
              const dateKey = toDateKey(cellDate);
              const isSelected = dateKey === selectedDateKey;
              const isTodayCell = dateKey === toDateKey(new Date());
              const hasReminders = (remindersByDate.get(dateKey) ?? []).length > 0;

              return (
                <Pressable
                  key={`day-${dayNum}`}
                  onPress={() => setSelectedDate(cellDate)}
                  className="h-11 w-[14.28%] items-center justify-center">
                  <View
                    className={cn(
                      'size-9 items-center justify-center rounded-full',
                      isSelected
                        ? 'bg-[#EFF0A3] dark:bg-[#EFF0A3]'
                        : isTodayCell
                          ? 'border border-primary/50 bg-transparent'
                          : ''
                    )}>
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        isSelected
                          ? 'font-bold text-[#1C1D00]'
                          : isTodayCell
                            ? 'font-bold text-primary'
                            : 'text-foreground'
                      )}>
                      {dayNum}
                    </Text>

                    {/* Dot indicator if day has reminders */}
                    {hasReminders && !isSelected && (
                      <View className="absolute bottom-1 size-1 rounded-full bg-[#596656] dark:bg-[#EFF0A3]" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* 3. Tasks for selected date shown below calendar */}
      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Due on {selectedDateLabel} ({tasksForSelectedDate.length})
          </Text>
        </View>

        {tasksForSelectedDate.length === 0 ? (
          <View className="items-center justify-center rounded-[22px] border border-black/[0.04] bg-muted/40 p-4 dark:border-white/10 dark:bg-[#1A1D23]/40">
            <Text className="text-sm font-medium text-muted-foreground">
              No reminders due on this date.
            </Text>
          </View>
        ) : (
          tasksForSelectedDate.map((reminder) => (
            <ReminderCardItem key={reminder.id} reminder={reminder} onComplete={onComplete} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function HistoryList({ reminders }: { reminders: Reminder[] }) {
  const [undoTarget, setUndoTarget] = React.useState<Reminder | null>(null);

  async function confirmUndo() {
    if (!undoTarget) return;
    await undoCompleteReminder(undoTarget);
    setUndoTarget(null);
  }

  if (reminders.length === 0) {
    return <EmptyState message="No completed reminders yet." />;
  }

  return (
    <>
      <ScrollView contentContainerClassName="gap-2.5 pb-24 pt-3">
        {reminders.map((reminder) => {
          const canUndo = !!reminder.undo_expires_at && Date.now() < reminder.undo_expires_at;
          return (
            <Animated.View
              key={reminder.id}
              layout={LinearTransition.duration(220)}
              entering={FadeInDown.duration(200)}
              exiting={FadeOutRight.duration(180)}
              className="flex-row items-center justify-between rounded-[22px] border border-black/[0.04] bg-card p-3.5 shadow-sm dark:border-white/10">
              <View className="min-w-0 flex-1 gap-0.5 pr-2">
                <Text
                  className="text-base font-semibold text-foreground line-through opacity-70"
                  numberOfLines={1}>
                  {reminder.title}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Completed{' '}
                  {reminder.completed_at
                    ? new Date(reminder.completed_at).toLocaleDateString()
                    : 'recently'}
                </Text>
              </View>
              <View className="shrink-0 flex-row items-center gap-2">
                {canUndo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full px-3"
                    onPress={() => setUndoTarget(reminder)}>
                    <Text className="text-xs">Undo</Text>
                  </Button>
                )}
                <Link href={`/reminders/${reminder.id}`} asChild>
                  <Button size="sm" variant="ghost" className="h-8 rounded-full px-2.5">
                    <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                  </Button>
                </Link>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <AlertDialog open={!!undoTarget} onOpenChange={(open) => !open && setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo completion?</AlertDialogTitle>
            <AlertDialogDescription>
              "{undoTarget?.title}" will move back to your active list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setUndoTarget(null)}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmCompleteUndo}>
              <Text>Undo</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  async function confirmCompleteUndo() {
    await confirmUndo();
  }
}
