import { Link, Stack } from 'expo-router';
import {
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Flame,
  Home,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { ReminderSuggestions } from '@/components/reminder-suggestions';
import { ASSET_CATEGORY_ICONS } from '@/components/asset-category-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScoreGauge, getScoreColor } from '@/components/ui/score-gauge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import { homeSuggestions, startOfDay } from '@/lib/reminders';
import { useCurrentHome } from '@/lib/use-current-home';

const UTILITY_TYPE_LABELS: Record<string, string> = {
  electric: 'Electric',
  gas: 'Gas',
  water: 'Water',
  sewer: 'Sewer',
  trash: 'Trash',
  internet: 'Internet',
  cell_service: 'Cell Service',
};

const UTILITY_TYPE_ICONS: Record<string, typeof Zap> = {
  electric: Zap,
  gas: Flame,
  water: Droplets,
  internet: Zap,
};

function getCategoryBadgeStyle(colorKey: string | null | undefined, assetType: string) {
  if (assetType === 'vehicle') {
    return {
      bg: 'bg-[#EFF0A3] dark:bg-[#EFF0A3]',
      icon: 'text-[#1C1D00] dark:text-[#1C1D00]',
    };
  }
  if (colorKey === 'primary') {
    return {
      bg: 'bg-[#EFF0A3] dark:bg-[#EFF0A3]',
      icon: 'text-[#1C1D00] dark:text-[#1C1D00]',
    };
  }
  if (colorKey === 'secondary') {
    return {
      bg: 'bg-[#D5E4D0] dark:bg-[#D5E4D0]',
      icon: 'text-[#121E12] dark:text-[#121E12]',
    };
  }
  return {
    bg: 'bg-muted dark:bg-[#252830]',
    icon: 'text-foreground dark:text-foreground',
  };
}

const UPCOMING_WINDOW_DAYS = 30;

export default function HomeScreen() {
  const { home, homeId } = useCurrentHome();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [utilitiesY, setUtilitiesY] = React.useState(0);

  const { data, isLoading, error } = useSupabaseQuery<{
    home: Tables<'homes'>;
    utilityProviders: Tables<'utility_providers'>[];
    categories: Tables<'asset_categories'>[];
    assets: Tables<'assets'>[];
    reminders: Tables<'reminders'>[];
    acceptedKeys: string[];
  } | null>(
    ['homes', 'utility_providers', 'asset_categories', 'assets', 'reminders'],
    !!homeId,
    async () => {
      const [
        homeResult,
        providersResult,
        categoriesResult,
        assetsResult,
        remindersResult,
        acceptedResult,
      ] = await Promise.all([
        supabase.from('homes').select('*').eq('id', homeId!).single(),
        supabase.from('utility_providers').select('*').eq('home_id', homeId!),
        supabase.from('asset_categories').select('*').eq('home_id', homeId!),
        supabase.from('assets').select('*').eq('home_id', homeId!),
        supabase
          .from('reminders')
          .select('*')
          .eq('home_id', homeId!)
          .eq('status', 'upcoming')
          .order('due_date', { ascending: true }),
        supabase.from('reminders').select('auto_key').eq('home_id', homeId!).eq('source', 'auto'),
      ]);
      const result =
        homeResult.error ??
        providersResult.error ??
        categoriesResult.error ??
        assetsResult.error ??
        remindersResult.error ??
        acceptedResult.error;
      if (result) throw result;
      if (!homeResult.data) return null;
      return {
        home: homeResult.data,
        utilityProviders: providersResult.data ?? [],
        categories: categoriesResult.data ?? [],
        assets: assetsResult.data ?? [],
        reminders: remindersResult.data ?? [],
        acceptedKeys: (acceptedResult.data ?? [])
          .map((reminder) => reminder.auto_key)
          .filter((key): key is string => !!key),
      };
    },
    [homeId]
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1).getTime();
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

  const windowEnd = Date.now() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const allUpcoming = data?.reminders ?? [];
  const upcomingReminders = allUpcoming.filter((reminder) => reminder.due_date <= windowEnd);
  const overdueCount = allUpcoming.filter((reminder) => reminder.due_date < startOfDay()).length;
  const dueThisMonthCount = allUpcoming.filter(
    (reminder) => reminder.due_date >= monthStart && reminder.due_date <= monthEnd
  ).length;

  const totalTrackedTasks = upcomingReminders.length + overdueCount;
  const healthScore =
    totalTrackedTasks === 0
      ? 100
      : Math.max(0, Math.round(((totalTrackedTasks - overdueCount) / totalTrackedTasks) * 100));
  const healthColors = getScoreColor(healthScore);

  if (!home) {
    return null;
  }

  const homeData = data?.home ?? home;
  const utilityProviders = data?.utilityProviders ?? [];
  const categories = data?.categories ?? [];
  const assets = data?.assets ?? [];
  const acceptedKeys = data?.acceptedKeys ?? [];
  const categoryCounts = new Map<string, number>();
  for (const asset of assets) {
    if (asset.category_id)
      categoryCounts.set(asset.category_id, (categoryCounts.get(asset.category_id) ?? 0) + 1);
  }
  const uncategorizedCount = assets.filter((asset) => asset.category_id === null).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-5 pb-24 pt-14">
        {/* Top Residence Header & Navigation */}
        <View className="flex-row items-center justify-between pb-2">
          <View className="gap-1">
            <View className="flex-row items-center gap-1.5">
              <View className="size-2 rounded-full bg-[#596656] dark:bg-[#EFF0A3]" />
              <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {homeData.street ? `${homeData.street.toUpperCase()}` : 'MY HOME'}
              </Text>
            </View>
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">
              Dashboard
            </Text>
            <Text className="text-sm font-medium text-muted-foreground">
              {overdueCount > 0
                ? `${overdueCount} maintenance task${overdueCount === 1 ? '' : 's'} require attention`
                : 'All home systems up to date'}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 self-start pt-2">
            <Link href="/reminders/add" asChild>
              <Button size="icon" className="size-11 rounded-full shadow-sm">
                <Icon as={Plus} className="size-5" />
              </Button>
            </Link>
          </View>
        </View>

        {/* Section - Main Domestic Health Status Bento Card */}
        <Card className="gap-4 rounded-[28px] border border-black/[0.04] p-5 shadow-sm dark:border-white/10">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Home Maintenance Health
            </Text>
            <Badge
              variant="outline"
              className={cn('rounded-full border-0 px-2.5 py-0.5', healthColors.badge)}>
              <View className="flex-row items-center gap-1.5">
                <View className={cn('size-1.5 rounded-full', healthColors.dot)} />
                <Text className="text-[11px] font-semibold">{healthColors.label}</Text>
              </View>
            </Badge>
          </View>

          <View className="flex-row items-center gap-4">
            <ScoreGauge score={healthScore} size={72} strokeWidth={3.5} />
            <View className="flex-1 gap-2">
              <Link href={{ pathname: '/reminders', params: { tab: 'month' } }} asChild>
                <Pressable className="h-[32px] flex-row items-center justify-between rounded-full bg-muted px-3.5 active:opacity-80 dark:bg-[#1E2026]">
                  <Text className="text-xs font-medium text-muted-foreground">Upcoming Tasks</Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs font-bold text-foreground">
                      {upcomingReminders.length}
                    </Text>
                    <Icon as={ChevronRight} size={13} className="text-muted-foreground" />
                  </View>
                </Pressable>
              </Link>
              <Link href={{ pathname: '/reminders', params: { tab: 'overdue' } }} asChild>
                <Pressable
                  className={cn(
                    'h-[32px] flex-row items-center justify-between rounded-full px-3.5 active:opacity-80',
                    overdueCount > 0
                      ? 'bg-[#FFDAD6] dark:bg-[#4E161C]'
                      : 'bg-secondary/40 dark:bg-secondary/20'
                  )}>
                  <Text
                    className={cn(
                      'text-xs font-medium',
                      overdueCount > 0
                        ? 'text-[#93000A] dark:text-[#FFB4AB]'
                        : 'text-secondary-foreground dark:text-[#CFDECA]'
                    )}>
                    Overdue Actions
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className={cn(
                        'text-xs font-bold',
                        overdueCount > 0
                          ? 'text-[#93000A] dark:text-[#FFB4AB]'
                          : 'text-secondary-foreground dark:text-[#CFDECA]'
                      )}>
                      {overdueCount}
                    </Text>
                    <Icon
                      as={ChevronRight}
                      size={13}
                      className={
                        overdueCount > 0
                          ? 'text-[#93000A] dark:text-[#FFB4AB]'
                          : 'text-muted-foreground'
                      }
                    />
                  </View>
                </Pressable>
              </Link>
            </View>
          </View>

          <View className="flex-row items-center justify-between border-t border-black/[0.04] pt-2.5 dark:border-white/10">
            <View className="flex-row items-center gap-2">
              <Icon as={ShieldCheck} className="size-4 text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">All tracked home systems active</Text>
            </View>
            <Link href={{ pathname: '/reminders', params: { tab: 'month' } }} asChild>
              <Pressable className="size-7 items-center justify-center rounded-full bg-muted dark:bg-[#1E2026]">
                <Icon as={ChevronRight} className="size-3.5 text-muted-foreground" />
              </Pressable>
            </Link>
          </View>
        </Card>

        {/* Section - 4-Stat Asymmetric Grid (Vanilla, Honeydew, Alice Blue, Soft Surface) */}
        <View className="flex-row gap-2.5">
          {/* Card 1: Attention (Vanilla Accent) */}
          <Link
            href={{ pathname: '/reminders', params: { tab: 'overdue' } }}
            asChild
            className="flex-1">
            <Pressable className="flex-1 gap-1.5 rounded-[22px] border-0 bg-[#EFF0A3] p-3.5 shadow-sm active:opacity-80 dark:border dark:border-[#EFF0A3]/20 dark:bg-[#1F2017]">
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#1C1D00]/70 dark:text-[#EFF0A3]/70">
                  Attention
                </Text>
                <View className="size-6 items-center justify-center rounded-full bg-[#1C1D00] dark:bg-[#EFF0A3]">
                  <Icon as={ArrowUpRight} size={14} className="text-white dark:text-[#1C1D00]" />
                </View>
              </View>
              <View className="pt-1">
                <Text className="text-2xl font-bold text-[#1C1D00] dark:text-[#EFF0A3]">
                  {overdueCount}
                </Text>
                <Text className="text-[11px] font-semibold text-[#1C1D00]/80 dark:text-[#EFF0A3]/80">
                  Overdue Tasks
                </Text>
              </View>
            </Pressable>
          </Link>

          {/* Card 2: Inventory (Honeydew Accent) */}
          <Link href="/assets" asChild className="flex-1">
            <Pressable className="flex-1 gap-1.5 rounded-[22px] border-0 bg-[#D5E4D0] p-3.5 shadow-sm active:opacity-80 dark:border dark:border-[#CFDECA]/20 dark:bg-[#223325]">
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-[#121E12]/70 dark:text-[#CFDECA]/70">
                  Inventory
                </Text>
                <View className="size-6 items-center justify-center rounded-full bg-[#121E12] dark:bg-[#CFDECA]">
                  <Icon as={ArrowUpRight} size={14} className="text-white dark:text-[#121E12]" />
                </View>
              </View>
              <View className="pt-1">
                <Text className="text-2xl font-bold text-[#121E12] dark:text-[#CFDECA]">
                  {assets.length}
                </Text>
                <Text className="text-[11px] font-semibold text-[#121E12]/80 dark:text-[#CFDECA]/80">
                  Monitored Assets
                </Text>
              </View>
            </Pressable>
          </Link>
        </View>

        <View className="flex-row gap-2.5">
          {/* Card 3: Utilities (Alice Blue Accent) */}
          <Pressable
            onPress={() =>
              scrollViewRef.current?.scrollTo({ y: Math.max(0, utilitiesY - 20), animated: true })
            }
            className="flex-1 gap-1.5 rounded-[22px] border-0 bg-[#E5ECF6] p-3.5 shadow-sm active:opacity-80 dark:border dark:border-[#D8DFE9]/20 dark:bg-[#172230]">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-[#151C23]/70 dark:text-[#D8DFE9]/70">
                Providers
              </Text>
              <View className="size-6 items-center justify-center rounded-full bg-[#151C23] dark:bg-[#D8DFE9]">
                <Icon as={ArrowUpRight} size={14} className="text-white dark:text-[#151C23]" />
              </View>
            </View>
            <View className="pt-1">
              <Text className="text-2xl font-bold text-[#151C23] dark:text-[#D8DFE9]">
                {utilityProviders.length}
              </Text>
              <Text className="text-[11px] font-semibold text-[#151C23]/80 dark:text-[#D8DFE9]/80">
                Active Utilities
              </Text>
            </View>
          </Pressable>

          {/* Card 4: Scheduled Upkeep (Surface Card) */}
          <Link
            href={{ pathname: '/reminders', params: { tab: 'month' } }}
            asChild
            className="flex-1">
            <Pressable className="flex-1 gap-1.5 rounded-[22px] border border-black/[0.04] bg-card p-3.5 shadow-sm active:opacity-80 dark:border-white/10 dark:bg-[#1A1D23]">
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  This Month
                </Text>
                <View className="size-6 items-center justify-center rounded-full bg-muted dark:bg-[#22262E]">
                  <Icon as={Calendar} size={14} className="text-foreground" />
                </View>
              </View>
              <View className="pt-1">
                <Text className="text-2xl font-bold text-foreground">{dueThisMonthCount}</Text>
                <Text className="text-[11px] font-semibold text-muted-foreground">This Month</Text>
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Section - Upcoming Reminders Bento List */}
        <Card className="gap-4 rounded-[36px] border border-black/[0.04] p-6 shadow-sm dark:border-white/10">
          <View className="flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text className="text-lg font-bold tracking-tight text-foreground">
                Upcoming Reminders
              </Text>
              <Text className="text-xs text-muted-foreground">
                Next {UPCOMING_WINDOW_DAYS} days
              </Text>
            </View>
            <Link href="/reminders" asChild>
              <Button size="sm" variant="outline">
                <Text>View All</Text>
              </Button>
            </Link>
          </View>

          {upcomingReminders.length === 0 ? (
            <View className="items-center justify-center rounded-[24px] bg-muted/60 p-5 dark:bg-[#1E2026]">
              <Icon as={CheckCircle2} className="mb-1 size-6 text-muted-foreground" />
              <Text className="text-sm font-medium text-muted-foreground">
                All caught up! Nothing due soon.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {upcomingReminders.slice(0, 4).map((reminder, index) => {
                const isLate = reminder.due_date < startOfDay();
                return (
                  <Animated.View
                    key={reminder.id}
                    layout={LinearTransition.duration(220)}
                    entering={FadeInDown.delay(index * 30).duration(200)}>
                    <Link
                      href={{
                        pathname: '/reminders/[id]',
                        params: { id: reminder.id, from: 'dashboard' },
                      }}
                      asChild>
                      <PressableScale
                        activeScale={0.98}
                        className="flex-row items-center justify-between rounded-[24px] bg-muted p-4 dark:bg-[#1E2026]">
                        <View className="flex-1 gap-1">
                          <Text className="text-base font-semibold text-foreground">
                            {reminder.title}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            Due {new Date(reminder.due_date).toLocaleDateString()}
                          </Text>
                        </View>
                        {isLate ? (
                          <Badge variant="destructive">
                            <Text>Overdue</Text>
                          </Badge>
                        ) : (
                          <View className="shadow-2xs size-8 items-center justify-center rounded-full bg-card">
                            <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                          </View>
                        )}
                      </PressableScale>
                    </Link>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Suggestion Module */}
        {homeId ? (
          <ReminderSuggestions
            suggestions={homeSuggestions({
              water_source: homeData.water_source,
              waste_system: homeData.waste_system,
              has_sprinklers: homeData.has_sprinklers,
              acreage: homeData.acreage,
            })}
            homeId={homeId}
            existingKeys={acceptedKeys}
            title="Suggested Maintenance"
            description="Recommended upkeep based on your home setup. Uncheck anything you don't want."
          />
        ) : null}

        {/* Section - Utility Providers Quick Widget */}
        <View
          onLayout={(e) => setUtilitiesY(e.nativeEvent.layout.y)}
          className="gap-4 rounded-[36px] border border-black/[0.04] bg-card p-6 shadow-sm dark:border-white/10">
          <View className="flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text className="text-lg font-bold tracking-tight text-foreground">Utilities</Text>
              <Text className="text-xs text-muted-foreground">
                {utilityProviders.length} active service{utilityProviders.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Link href="/utility-providers/add" asChild>
              <Button size="icon-sm" variant="outline">
                <Icon as={Plus} className="size-4" />
              </Button>
            </Link>
          </View>

          {utilityProviders.length === 0 ? (
            <View className="items-center justify-center rounded-[24px] bg-muted/60 p-5 dark:bg-[#1E2026]">
              <Text className="text-sm text-muted-foreground">No providers added yet.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {utilityProviders.map((provider) => {
                const ProviderIcon = UTILITY_TYPE_ICONS[provider.type] ?? Zap;
                return (
                  <View
                    key={provider.id}
                    className="flex-row items-center justify-between rounded-[24px] bg-muted p-4 dark:bg-[#1E2026]">
                    <View className="flex-row items-center gap-3">
                      <View className="shadow-2xs size-10 items-center justify-center rounded-full bg-card dark:bg-[#2A2E38]">
                        <Icon as={ProviderIcon} className="size-5 text-foreground" />
                      </View>
                      <View className="gap-0.5">
                        <Text className="text-base font-semibold text-foreground">
                          {provider.provider_name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {UTILITY_TYPE_LABELS[provider.type] ?? provider.type}
                        </Text>
                      </View>
                    </View>
                    <Badge variant="secondary">
                      <Text>Active</Text>
                    </Badge>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Section - Assets Summary */}
        <Card className="gap-4 rounded-[36px] border border-black/[0.04] p-6 shadow-sm dark:border-white/10">
          <View className="flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text className="text-lg font-bold tracking-tight text-foreground">Assets</Text>
              <Text className="text-xs text-muted-foreground">
                {assets.length} tracked item{assets.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Link href="/assets/add" asChild>
              <Button size="icon-sm" variant="outline">
                <Icon as={Plus} className="size-4" />
              </Button>
            </Link>
          </View>

          {categories.length === 0 ? (
            <View className="items-center justify-center rounded-[24px] bg-muted/60 p-5 dark:bg-[#1E2026]">
              <Text className="text-sm text-muted-foreground">No categories yet.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {[...categories]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((category) => {
                  const CategoryIcon =
                    ASSET_CATEGORY_ICONS[category.icon_key as keyof typeof ASSET_CATEGORY_ICONS] ??
                    Package;
                  const badgeStyle = getCategoryBadgeStyle(category.color_key, category.asset_type);
                  return (
                    <Link
                      key={category.id}
                      href={{
                        pathname: '/assets/categories/[id]',
                        params: { id: category.id, from: 'dashboard' },
                      }}
                      asChild>
                      <Pressable className="flex-row items-center justify-between rounded-[24px] bg-muted p-3.5 active:opacity-80 dark:bg-[#1E2026]">
                        <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
                          <View
                            className={`size-10 items-center justify-center rounded-2xl ${badgeStyle.bg}`}>
                            <Icon
                              as={CategoryIcon}
                              size={20}
                              className={badgeStyle.icon}
                              strokeWidth={2.2}
                            />
                          </View>
                          <Text
                            className="flex-1 text-base font-semibold text-foreground"
                            numberOfLines={1}>
                            {category.name}
                          </Text>
                        </View>
                        <View className="shrink-0 flex-row items-center gap-2">
                          <Badge variant="surface" className="px-2.5 py-0.5">
                            <Text className="text-xs font-bold text-muted-foreground">
                              {categoryCounts.get(category.id) ?? 0}
                            </Text>
                          </Badge>
                          <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                        </View>
                      </Pressable>
                    </Link>
                  );
                })}
              {uncategorizedCount > 0 ? (
                <Link
                  href={{
                    pathname: '/assets/uncategorized',
                    params: { from: 'dashboard' },
                  }}
                  asChild>
                  <Pressable className="flex-row items-center justify-between rounded-[24px] bg-muted p-3.5 active:opacity-80 dark:bg-[#1E2026]">
                    <Text
                      className="flex-1 text-base font-semibold text-foreground"
                      numberOfLines={1}>
                      Uncategorized
                    </Text>
                    <View className="shrink-0 flex-row items-center gap-2">
                      <Badge variant="surface" className="px-2.5 py-0.5">
                        <Text className="text-xs font-bold text-muted-foreground">
                          {uncategorizedCount}
                        </Text>
                      </Badge>
                      <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                    </View>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          )}
        </Card>
      </ScrollView>
    </>
  );
}
