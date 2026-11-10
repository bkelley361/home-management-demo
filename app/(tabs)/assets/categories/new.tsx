import { router, Stack } from 'expo-router';

import { AssetCategoryEditor } from '@/components/asset-category-editor';
import { FormScreen } from '@/components/ui/form-screen';
import { ScreenBackButton } from '@/components/ui/screen-back-button';

export default function NewAssetCategoryScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'New category',
          headerShown: true,
          headerLeft: () => <ScreenBackButton fallbackHref="/assets/categories" />,
        }}
      />
      <FormScreen>
        <AssetCategoryEditor onSaved={() => router.back()} />
      </FormScreen>
    </>
  );
}
