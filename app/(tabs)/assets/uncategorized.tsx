import { Link, router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { supabase as db } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';
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
import { useCurrentHome } from '@/lib/use-current-home';
import { useSupabaseQuery } from '@/lib/use-supabase-query';

type AssetRow = Pick<
  Tables<'assets'>,
  | 'id'
  | 'asset_type'
  | 'name'
  | 'year'
  | 'make'
  | 'model'
  | 'vin'
  | 'mileage'
  | 'brand'
  | 'model_number'
  | 'location_in_home'
>;

export default function UncategorizedAssetsScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const navigation = useNavigation();
  const { homeId } = useCurrentHome();
  const [assetToDelete, setAssetToDelete] = React.useState<AssetRow | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // When opened from Dashboard, ensure uncategorized is at the root of the assets stack
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
  }, [from, navigation]);

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

  const {
    data: assets,
    isLoading,
    error,
    refresh,
  } = useSupabaseQuery<AssetRow[]>(
    ['assets'],
    !!homeId,
    async () => {
      if (!homeId) return [];
      const { data, error: queryError } = await db
        .from('assets')
        .select('*')
        .eq('home_id', homeId)
        .is('category_id', null);
      if (queryError) throw queryError;
      return (data ?? []) as unknown as AssetRow[];
    },
    [homeId]
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

  const itemToDeleteTitle = assetToDelete
    ? assetToDelete.asset_type === 'vehicle'
      ? `${assetToDelete.year ?? ''} ${assetToDelete.make ?? ''} ${assetToDelete.model ?? ''}`.trim() ||
        'vehicle'
      : assetToDelete.name || 'item'
    : 'item';

  const fallbackHref = from === 'dashboard' ? '/' : '/assets';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Uncategorized',
          headerShown: true,
          headerLeft: () => <ScreenBackButton fallbackHref={fallbackHref} />,
        }}
      />
      <FormScreen contentClassName="gap-4 px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold tracking-tight text-foreground">Uncategorized</Text>
          <Link href="/assets/add" asChild>
            <Button size="sm">
              <Text>Add Asset</Text>
            </Button>
          </Link>
        </View>
        {error ? (
          <Text className="text-destructive">Could not load assets: {error.message}</Text>
        ) : null}
        {isLoading && !assets ? (
          <Skeleton className="h-20 w-full rounded-[28px]" />
        ) : assets?.length ? (
          assets.map((asset) => (
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
              There are no uncategorized assets.
            </Text>
          </View>
        )}
      </FormScreen>

      <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {assetToDelete?.asset_type === 'vehicle' ? 'Vehicle' : 'Item'}?
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
