import { Link, router, Stack } from 'expo-router';
import { ChevronRight, Package, Plus, SlidersHorizontal } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import {
  ASSET_CATEGORY_COLOR_CLASSES,
  ASSET_CATEGORY_ICONS,
  type AssetCategoryIconKey,
} from '@/components/asset-category-editor';
import type { Tables } from '@/lib/database.types';
import { supabase as db } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useCurrentHome } from '@/lib/use-current-home';
import { useSupabaseQuery } from '@/lib/use-supabase-query';

function getCategoryBadgeStyle(colorKey: string | null | undefined) {
  switch (colorKey) {
    case 'primary':
    case 'accent':
      return {
        container: 'bg-[#EFF0A3] dark:bg-[#EFF0A3]',
        icon: 'text-[#1C1D00] dark:text-[#1C1D00]',
      };
    case 'secondary':
      return {
        container: 'bg-[#D5E4D0] dark:bg-[#223325] dark:border dark:border-[#CFDECA]/20',
        icon: 'text-[#121E12] dark:text-[#CFDECA]',
      };
    case 'muted':
      return {
        container: 'bg-[#E5ECF6] dark:bg-[#1C2330] dark:border dark:border-white/10',
        icon: 'text-[#1A2840] dark:text-[#D8DFE9]',
      };
    default:
      return {
        container: 'bg-muted dark:bg-[#22262E] dark:border dark:border-white/10',
        icon: 'text-foreground',
      };
  }
}

type Overview = {
  categories: (Tables<'asset_categories'> & {
    icon_key: AssetCategoryIconKey;
    color_key: 'primary' | 'secondary' | 'accent' | 'muted' | null;
    asset_type: 'vehicle' | 'general';
  })[];
  assets: Pick<Tables<'assets'>, 'id' | 'category_id'>[];
};

export default function AssetsScreen() {
  const { homeId } = useCurrentHome();
  const { data, isLoading, error } = useSupabaseQuery<Overview>(
    ['asset_categories', 'assets'],
    !!homeId,
    async () => {
      if (!homeId) return { categories: [], assets: [] };
      const [categoryResult, assetResult] = await Promise.all([
        db
          .from('asset_categories')
          .select('*')
          .eq('home_id', homeId)
          .order('name', { ascending: true }),
        db.from('assets').select('id,category_id').eq('home_id', homeId),
      ]);
      if (categoryResult.error) throw categoryResult.error;
      if (assetResult.error) throw assetResult.error;
      return {
        categories: (categoryResult.data ?? []) as Overview['categories'],
        assets: assetResult.data ?? [],
      };
    },
    [homeId]
  );

  const categories = data?.categories ?? [];
  const assets = data?.assets ?? [];

  if (isLoading && !data)
    return (
      <View className="flex-1 gap-4 bg-background px-5 pt-14">
        <Stack.Screen options={{ title: 'Assets' }} />
        <Skeleton className="h-14 w-full rounded-[32px]" />
        <Skeleton className="h-28 w-full rounded-[32px]" />
        <Skeleton className="h-28 w-full rounded-[32px]" />
      </View>
    );

  return (
    <>
      <Stack.Screen options={{ title: 'Assets' }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-5 pb-24 pt-14">
        {/* Top Header */}
        <View className="flex-row items-center justify-between pb-3">
          <View className="flex-1 gap-1 pr-3">
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">Assets</Text>
            <Text className="text-sm font-medium text-muted-foreground">
              {assets.length} {assets.length === 1 ? 'tracked item' : 'tracked items'} ·{' '}
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Link href="/assets/categories" asChild>
              <Button
                size="icon"
                variant="outline"
                className="size-10 rounded-full"
                accessibilityLabel="Manage categories">
                <Icon as={SlidersHorizontal} className="size-4 text-foreground" />
              </Button>
            </Link>
            <Link href="/assets/add" asChild>
              <Button size="sm" className="rounded-full px-4 shadow-sm">
                <Icon as={Plus} className="size-4" />
                <Text>Add Asset</Text>
              </Button>
            </Link>
          </View>
        </View>

        {error ? (
          <Text className="text-destructive">Could not load assets: {error.message}</Text>
        ) : null}

        {/* Category Cards List */}
        <View className="gap-2.5 pt-1">
          {categories.map((category, index) => {
            const count = assets.filter((asset) => asset.category_id === category.id).length;
            const CategoryIcon =
              ASSET_CATEGORY_ICONS[category.icon_key as keyof typeof ASSET_CATEGORY_ICONS] ??
              Package;
            const badgeStyle = getCategoryBadgeStyle(category.color_key);
            return (
              <Animated.View
                key={category.id}
                layout={LinearTransition.duration(220)}
                entering={FadeInDown.delay(index * 30).duration(200)}>
                <PressableScale
                  activeScale={0.98}
                  onPress={() => router.push(`/assets/categories/${category.id}`)}
                  className="flex-row items-center justify-between rounded-[32px] border border-black/[0.04] bg-card p-5 shadow-sm dark:border-white/10">
                  <View className="min-w-0 flex-1 flex-row items-center gap-3.5 pr-2">
                    <View
                      className={cn(
                        'size-12 items-center justify-center rounded-full',
                        badgeStyle.container
                      )}>
                      <Icon
                        as={CategoryIcon}
                        size={22}
                        strokeWidth={2.2}
                        className={badgeStyle.icon}
                      />
                    </View>
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text numberOfLines={1} className="text-base font-bold text-foreground">
                        {category.name}
                      </Text>
                      <Text className="text-xs font-medium text-muted-foreground">
                        {category.asset_type === 'vehicle' ? 'Vehicles' : 'General items'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Badge variant="surface">
                      <Text>
                        {count} {count === 1 ? 'item' : 'items'}
                      </Text>
                    </Badge>
                    <View className="size-8 items-center justify-center rounded-full bg-muted dark:bg-[#22262E]">
                      <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                    </View>
                  </View>
                </PressableScale>
              </Animated.View>
            );
          })}

          {assets.some((asset) => !asset.category_id) ? (
            <Animated.View
              layout={LinearTransition.duration(220)}
              entering={FadeInDown.delay(categories.length * 30).duration(200)}>
              <PressableScale
                activeScale={0.98}
                onPress={() => router.push('/assets/uncategorized')}
                className="flex-row items-center justify-between rounded-[32px] border border-black/[0.04] bg-card p-5 shadow-sm dark:border-white/10">
                <View className="flex-row items-center gap-3.5">
                  <View className="size-12 items-center justify-center rounded-full bg-muted dark:border dark:border-white/10 dark:bg-[#22262E]">
                    <Icon as={Package} size={22} strokeWidth={2.2} className="text-foreground" />
                  </View>
                  <Text className="text-base font-bold text-foreground">Uncategorized</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Badge variant="surface">
                    <Text>{assets.filter((asset) => !asset.category_id).length} items</Text>
                  </Badge>
                  <View className="size-8 items-center justify-center rounded-full bg-muted dark:bg-[#22262E]">
                    <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          ) : null}

          {categories.length === 0 && !assets.length ? (
            <View className="items-center justify-center gap-2 rounded-[32px] bg-muted/50 p-8">
              <Icon as={Package} className="size-8 text-muted-foreground" />
              <Text className="text-center font-medium text-muted-foreground">
                Create a category or add an asset to start tracking your home.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
