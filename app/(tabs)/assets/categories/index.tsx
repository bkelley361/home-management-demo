import { Link, Stack, router } from 'expo-router';
import { Package, Plus, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { supabase as db } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';
import {
  AssetCategoryEditor,
  ASSET_CATEGORY_COLOR_CLASSES,
  ASSET_CATEGORY_ICONS,
  type AssetCategoryIconKey,
} from '@/components/asset-category-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form-error';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenBackButton } from '@/components/ui/screen-back-button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCurrentHome } from '@/lib/use-current-home';
import { useSupabaseQuery } from '@/lib/use-supabase-query';

type ManagerData = {
  categories: (Tables<'asset_categories'> & {
    icon_key: AssetCategoryIconKey;
    color_key: 'primary' | 'secondary' | 'accent' | 'muted' | null;
    asset_type: 'vehicle' | 'general';
  })[];
  assets: Pick<Tables<'assets'>, 'id' | 'category_id' | 'asset_type'>[];
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

export default function CategoriesScreen() {
  const { homeId } = useCurrentHome();
  const { data, isLoading, error, refresh } = useSupabaseQuery<ManagerData>(
    ['asset_categories', 'assets'],
    !!homeId,
    async () => {
      if (!homeId) return { categories: [], assets: [] };
      const [categoryResult, assetResult] = await Promise.all([
        db.from('asset_categories').select('*').eq('home_id', homeId).order('name'),
        db.from('assets').select('id,category_id,asset_type').eq('home_id', homeId),
      ]);
      if (categoryResult.error) throw categoryResult.error;
      if (assetResult.error) throw assetResult.error;
      return {
        categories: (categoryResult.data ?? []) as ManagerData['categories'],
        assets: assetResult.data ?? [],
      };
    },
    [homeId]
  );
  const categories = data?.categories ?? [];
  const assets = data?.assets ?? [];
  const [deleting, setDeleting] = React.useState<ManagerData['categories'][number] | null>(null);
  const [destinationId, setDestinationId] = React.useState<string | null | undefined>(undefined);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = React.useState(false);

  const sourceCount = deleting
    ? assets.filter((asset) => asset.category_id === deleting.id).length
    : 0;
  const destinations = deleting
    ? categories.filter(
        (category) => category.id !== deleting.id && category.asset_type === deleting.asset_type
      )
    : [];
  function closeDelete() {
    if (deletingBusy) return;
    setDeleting(null);
    setDestinationId(undefined);
    setDeleteError(null);
  }
  async function deleteCategory() {
    if (!deleting || !homeId) return;
    if (sourceCount > 0 && destinations.length > 0 && destinationId === undefined) {
      setDeleteError('Choose a destination or leave items uncategorized.');
      return;
    }
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      const result = destinationId
        ? await db.rpc('delete_asset_category', {
            p_category_id: deleting.id,
            p_destination_category_id: destinationId,
          })
        : await db.rpc('delete_asset_category', { p_category_id: deleting.id });
      const { error: rpcError } = result;
      if (rpcError) throw rpcError;
      setDeleting(null);
      setDestinationId(undefined);
      setDeleteError(null);
      refresh();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete category.');
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Categories',
          headerShown: true,
          headerLeft: () => <ScreenBackButton fallbackHref="/assets" />,
        }}
      />
      <FormScreen>
        <View className="flex-row items-center justify-between pb-2">
          <View className="gap-0.5">
            <Text className="text-2xl font-bold tracking-tight text-foreground">Categories</Text>
            <Text className="text-xs text-muted-foreground">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'} organized
            </Text>
          </View>
          <Link href="/assets/categories/new" asChild>
            <Button size="sm" className="rounded-full shadow-sm">
              <Icon as={Plus} className="size-4" />
              <Text>New Category</Text>
            </Button>
          </Link>
        </View>

        {isLoading && !data ? (
          <View className="gap-3 pt-2">
            <Skeleton className="h-16 w-full rounded-[24px]" />
            <Skeleton className="h-16 w-full rounded-[24px]" />
          </View>
        ) : null}

        {error ? (
          <Text className="text-destructive">Could not load categories: {error.message}</Text>
        ) : null}

        {categories.map((category) => {
          const CategoryIcon =
            ASSET_CATEGORY_ICONS[category.icon_key as keyof typeof ASSET_CATEGORY_ICONS] ?? Package;
          const badgeStyle = getCategoryBadgeStyle(category.color_key, category.asset_type);
          const count = assets.filter((asset) => asset.category_id === category.id).length;
          return (
            <Animated.View
              key={category.id}
              layout={LinearTransition.duration(220)}
              entering={FadeInDown.duration(200)}
              exiting={FadeOutRight.duration(180)}
              className="flex-row items-center justify-between rounded-[24px] border border-black/[0.04] bg-card p-4 shadow-sm dark:border-white/10">
              <PressableScale
                activeScale={0.97}
                onPress={() => router.push(`/assets/categories/${category.id}/edit`)}
                className="flex-1 flex-row items-center gap-3">
                <View
                  className={`size-11 items-center justify-center rounded-2xl ${badgeStyle.bg}`}>
                  <Icon as={CategoryIcon} size={22} className={badgeStyle.icon} strokeWidth={2.2} />
                </View>
                <View className="gap-0.5">
                  <Text className="text-base font-semibold text-foreground">{category.name}</Text>
                  <Text className="text-xs font-medium text-muted-foreground">
                    {category.asset_type === 'vehicle' ? 'Vehicle' : 'General'} · {count}{' '}
                    {count === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </PressableScale>
              <View className="flex-row items-center gap-1.5">
                <Link href={`/assets/categories/${category.id}/edit`} asChild>
                  <Button size="sm" variant="outline" className="rounded-full px-3">
                    <Text>Edit</Text>
                  </Button>
                </Link>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-full"
                  accessibilityLabel={`Delete ${category.name}`}
                  onPress={() => {
                    setDeleting(category);
                    setDestinationId(undefined);
                    setDeleteError(null);
                  }}>
                  <Icon as={Trash2} className="size-4 text-destructive" />
                </Button>
              </View>
            </Animated.View>
          );
        })}
        {!isLoading && !categories.length ? (
          <Text className="py-8 text-center text-muted-foreground">
            No categories yet. Add one to organize your assets.
          </Text>
        ) : null}
      </FormScreen>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}>
        <DialogContent className="max-h-[90%]">
          <DialogTitle>Delete {deleting?.name}?</DialogTitle>
          <DialogDescription>
            {sourceCount
              ? `Choose what happens to its ${sourceCount} ${sourceCount === 1 ? 'item' : 'items'} before deleting this category.`
              : 'This category is empty and will be permanently deleted.'}
          </DialogDescription>
          {sourceCount ? (
            <View className="gap-2">
              {destinations.length ? (
                <>
                  <Label>Move all items to</Label>
                  <Select
                    value={
                      destinationId
                        ? {
                            value: destinationId,
                            label:
                              destinations.find((item) => item.id === destinationId)?.name ?? '',
                          }
                        : undefined
                    }
                    onValueChange={(option) => setDestinationId(option?.value ?? null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose same-template category" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((item) => (
                        <SelectItem key={item.id} value={item.id} label={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onPress={() => setDestinationId(null)}>
                    <Text>{destinationId === null ? '✓ ' : ''}Leave items uncategorized</Text>
                  </Button>
                </>
              ) : (
                <Text>
                  There is no other {deleting?.asset_type === 'vehicle' ? 'Vehicle' : 'General'}{' '}
                  category. Items will be left uncategorized.
                </Text>
              )}
            </View>
          ) : null}
          <FormError message={deleteError} />
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onPress={closeDelete}
              disabled={deletingBusy}>
              <Text>Cancel</Text>
            </Button>
            <Button
              className="flex-1"
              variant="destructive"
              onPress={deleteCategory}
              disabled={
                deletingBusy ||
                (!!sourceCount && !!destinations.length && destinationId === undefined)
              }>
              <Text>{deletingBusy ? 'Deleting…' : sourceCount ? 'Delete category' : 'Delete'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </>
  );
}
