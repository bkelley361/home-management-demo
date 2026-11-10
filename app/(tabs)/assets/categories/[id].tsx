import { Link, router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { ChevronRight, Package, Plus, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { supabase as db } from '@/lib/supabase';
import {
  ASSET_CATEGORY_ICONS,
  type AssetCategoryIconKey,
  type AssetTemplate,
} from '@/components/asset-category-editor';
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
import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenBackButton } from '@/components/ui/screen-back-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { deleteDocument } from '@/lib/documents';
import { cn } from '@/lib/utils';
import { useCurrentHome } from '@/lib/use-current-home';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import type { Tables } from '@/lib/database.types';

type AssetRow = Pick<
  Tables<'assets'>,
  | 'id'
  | 'category_id'
  | 'asset_type'
  | 'name'
  | 'year'
  | 'make'
  | 'model'
  | 'brand'
  | 'model_number'
  | 'location_in_home'
  | 'vin'
  | 'mileage'
>;

type CategoryRow = Tables<'asset_categories'> & {
  icon_key: AssetCategoryIconKey;
  color_key: 'primary' | 'secondary' | 'accent' | 'muted' | null;
  asset_type: AssetTemplate;
};

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

export default function CategoryItemsScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const navigation = useNavigation();
  const { homeId } = useCurrentHome();
  const [assetToDelete, setAssetToDelete] = React.useState<AssetRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // When opened from Dashboard, ensure this category is at the root of the assets stack
  // so prior categories or screens don't accumulate in the back stack.
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
  // reset assets stack to root 'index' and return to dashboard.
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

  const { data, isLoading, error, refresh } = useSupabaseQuery<{
    category: CategoryRow | null;
    assets: AssetRow[];
  }>(
    ['asset_categories', 'assets'],
    !!id && !!homeId,
    async () => {
      if (!id || !homeId) return { category: null, assets: [] };
      const [categoryResult, assetResult] = await Promise.all([
        db.from('asset_categories').select('*').eq('id', id).eq('home_id', homeId).maybeSingle(),
        db.from('assets').select('*').eq('category_id', id).eq('home_id', homeId),
      ]);
      if (categoryResult.error) throw categoryResult.error;
      return {
        category: (categoryResult.data ?? null) as CategoryRow | null,
        assets: assetResult.data ?? [],
      };
    },
    [id, homeId]
  );

  async function handleDeleteAsset() {
    if (!assetToDelete || !homeId) return;
    setIsDeleting(true);
    try {
      const { data: docs } = await db
        .from('documents')
        .select('id, storage_path')
        .eq('asset_id', assetToDelete.id)
        .eq('home_id', homeId);
      if (docs?.length) {
        for (const doc of docs) {
          await deleteDocument(doc.id, doc.storage_path, homeId);
        }
      }
      const { error: delError } = await db
        .from('assets')
        .delete()
        .eq('id', assetToDelete.id)
        .eq('home_id', homeId);
      if (delError) throw delError;
      refresh();
    } catch (err) {
      console.warn('Could not delete asset:', err);
    } finally {
      setIsDeleting(false);
      setAssetToDelete(null);
    }
  }

  const category = data?.category;

  const fallbackHref = from === 'dashboard' ? '/' : '/assets';

  if (isLoading && !data)
    return (
      <FormScreen>
        <Stack.Screen
          options={{
            title: 'Category',
            headerShown: true,
            headerLeft: () => <ScreenBackButton fallbackHref={fallbackHref} />,
          }}
        />
        <Skeleton className="h-16 w-full rounded-[28px]" />
        <Skeleton className="h-20 w-full rounded-[28px]" />
      </FormScreen>
    );

  if (!category)
    return (
      <FormScreen>
        <Stack.Screen
          options={{
            title: 'Category',
            headerShown: true,
            headerLeft: () => <ScreenBackButton fallbackHref={fallbackHref} />,
          }}
        />
        <View className="items-center justify-center gap-4 rounded-[32px] bg-muted/40 p-8">
          <Text className="text-center font-medium text-muted-foreground">
            {error ? `Could not load category: ${error.message}` : 'Category not found.'}
          </Text>
          <Button variant="outline" onPress={() => router.replace(fallbackHref as any)}>
            <Text>{from === 'dashboard' ? 'Back to home' : 'Back to assets'}</Text>
          </Button>
        </View>
      </FormScreen>
    );

  const CategoryIcon =
    ASSET_CATEGORY_ICONS[category.icon_key as keyof typeof ASSET_CATEGORY_ICONS] ?? Package;
  const title = category.name;
  const badgeStyle = getCategoryBadgeStyle(category.color_key);

  const itemToDeleteTitle = assetToDelete
    ? assetToDelete.asset_type === 'vehicle'
      ? `${assetToDelete.year ?? ''} ${assetToDelete.make ?? ''} ${assetToDelete.model ?? ''}`.trim() ||
        'vehicle'
      : assetToDelete.name || 'item'
    : 'item';

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerLeft: () => <ScreenBackButton fallbackHref={fallbackHref} />,
          headerRight: () => (
            <Link href={`/assets/categories/${id}/edit`} asChild>
              <Button size="sm" variant="ghost">
                <Text>Edit</Text>
              </Button>
            </Link>
          ),
        }}
      />
      <FormScreen contentClassName="gap-4 px-5 pt-4">
        {/* Category Header Card */}
        <View className="flex-row items-center justify-between rounded-[32px] border border-black/[0.04] bg-card p-5 shadow-sm dark:border-white/10">
          <View className="flex-row items-center gap-3.5">
            <View
              className={cn(
                'size-14 items-center justify-center rounded-full',
                badgeStyle.container
              )}>
              <Icon as={CategoryIcon} size={26} strokeWidth={2.2} className={badgeStyle.icon} />
            </View>
            <View className="gap-0.5">
              <Text className="text-2xl font-bold tracking-tight text-foreground">{title}</Text>
              <Text className="text-xs font-medium text-muted-foreground">
                {category.asset_type === 'vehicle' ? 'Vehicles' : 'General items'} ·{' '}
                {(data?.assets ?? []).length} {(data?.assets ?? []).length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          <Link href={{ pathname: '/assets/add', params: { categoryId: category.id } }} asChild>
            <Button size="icon" className="size-10 rounded-full shadow-sm">
              <Icon as={Plus} className="size-5" />
            </Button>
          </Link>
        </View>

        {/* Category Asset Items */}
        {(data?.assets ?? []).length ? (
          (data?.assets ?? []).map((asset) => (
            <Animated.View
              key={asset.id}
              layout={LinearTransition.duration(220)}
              entering={FadeInDown.duration(200)}
              exiting={FadeOutRight.duration(180)}>
              <PressableScale
                activeScale={0.98}
                onPress={() => router.push(`/assets/${asset.id}`)}
                className="flex-row items-center justify-between rounded-[28px] border border-black/[0.04] bg-card p-4 shadow-sm dark:border-white/10">
                <View className="flex-1 gap-1 pr-2">
                  <Text className="text-base font-bold text-foreground">
                    {asset.asset_type === 'vehicle'
                      ? `${asset.year ?? ''} ${asset.make ?? ''} ${asset.model ?? ''}`.trim() ||
                        'Vehicle'
                      : (asset.name ?? 'Unnamed item')}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {asset.asset_type === 'vehicle'
                      ? `${(asset.mileage ?? 0).toLocaleString()} miles${asset.vin ? ' · VIN' : ''}`
                      : [asset.brand, asset.model_number, asset.location_in_home]
                          .filter(Boolean)
                          .join(' · ')}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <PressableScale
                    activeScale={0.88}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Delete item"
                    className="size-9 items-center justify-center rounded-full bg-muted/80 dark:bg-[#22262E]"
                    onPress={(e) => {
                      e.stopPropagation();
                      setAssetToDelete(asset);
                    }}>
                    <Icon as={Trash2} className="size-4 text-muted-foreground" />
                  </PressableScale>
                  <View className="size-8 items-center justify-center rounded-full bg-muted dark:bg-[#22262E]">
                    <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          ))
        ) : (
          <View className="items-center justify-center gap-2 rounded-[32px] bg-muted/40 p-8">
            <Text className="text-center font-medium text-muted-foreground">
              No items in this category yet. Tap + to add one.
            </Text>
          </View>
        )}
      </FormScreen>

      <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {category.asset_type === 'vehicle' ? 'Vehicle' : 'Item'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {itemToDeleteTitle} and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive active:bg-destructive/90"
              onPress={handleDeleteAsset}>
              <Text className="text-destructive-foreground">
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
