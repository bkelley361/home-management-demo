import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';

import { AssetCategoryEditor, type AssetCategory } from '@/components/asset-category-editor';
import { FormScreen } from '@/components/ui/form-screen';
import { ScreenBackButton } from '@/components/ui/screen-back-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { useCurrentHome } from '@/lib/use-current-home';
import { useSupabaseQuery } from '@/lib/use-supabase-query';

export default function EditAssetCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { homeId } = useCurrentHome();
  const {
    data: category,
    isLoading,
    error,
  } = useSupabaseQuery<AssetCategory | null>(
    ['asset_categories'],
    !!id && !!homeId,
    async () => {
      if (!id || !homeId) return null;
      const { data, error: queryError } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('id', id)
        .eq('home_id', homeId)
        .maybeSingle();
      if (queryError) throw queryError;
      return (data as unknown as AssetCategory | null) ?? null;
    },
    [id, homeId]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit category',
          headerShown: true,
          headerLeft: () => (
            <ScreenBackButton fallbackHref={id ? `/assets/categories/${id}` : '/assets'} />
          ),
        }}
      />
      <FormScreen>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : category ? (
          <AssetCategoryEditor
            key={category.id}
            initial={category}
            allowTemplateChange={false}
            onSaved={() => router.back()}
          />
        ) : (
          <Text>{error ? `Could not load category: ${error.message}` : 'Category not found.'}</Text>
        )}
      </FormScreen>
    </>
  );
}
