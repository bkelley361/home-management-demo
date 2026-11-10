import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { AlertCircle, Sparkles } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { deleteDocument, signedDocumentUrl } from '@/lib/documents';
import { getComprehensiveReminders } from '@/lib/ai-reminders';
import { Icon } from '@/components/ui/icon';
import { ScreenBackButton } from '@/components/ui/screen-back-button';

import { AssetDocumentsCard, type AssetDocument } from '@/components/asset-documents-card';
import { AssetExpensesCard } from '@/components/asset-expenses-card';
import { AssetPartsCard } from '@/components/asset-parts-card';
import { ReminderSuggestions } from '@/components/reminder-suggestions';
import { WarrantyRegistrationCard } from '@/components/warranty-registration-card';
import { type AssetCategory, type AssetTemplate } from '@/components/asset-category-editor';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormScreen } from '@/components/ui/form-screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Tables } from '@/lib/database.types';
import { supabase as db } from '@/lib/supabase';
import { useCurrentHome } from '@/lib/use-current-home';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import {
  generalAssetSuggestions,
  type LegacyAssetKind,
  type ReminderSuggestion,
  vehicleSuggestions,
  warrantySuggestion,
  WARRANTY_LEAD_DAYS,
} from '@/lib/reminder-suggestions';

type AssetRecord = Tables<'assets'>;
type ReminderRow = Pick<Tables<'reminders'>, 'id' | 'title' | 'auto_key'>;
type PartRow = Pick<
  Tables<'parts'>,
  | 'id'
  | 'part_name'
  | 'part_number'
  | 'brand'
  | 'notes'
  | 'source_link'
  | 'last_replaced_date'
  | 'replacement_rule'
>;
type ExpenseRow = Pick<
  Tables<'expenses'>,
  'id' | 'amount_cents' | 'category' | 'incurred_at' | 'description' | 'vendor'
>;
type DocumentRow = Pick<
  Tables<'documents'>,
  | 'id'
  | 'title'
  | 'doc_type'
  | 'content_type'
  | 'size_bytes'
  | 'uploaded_at'
  | 'storage_path'
  | 'uploaded_by_id'
>;
type Detail = {
  asset: AssetRecord;
  category: AssetCategory | null;
  parts: PartRow[];
  reminders: ReminderRow[];
  expenses: ExpenseRow[];
  documents: AssetDocument[];
};
function SpecRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View className="flex-row items-center justify-between border-b border-black/[0.04] py-2.5 last:border-b-0 dark:border-white/5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { homeId, profileId } = useCurrentHome();
  const [generatingAi, setGeneratingAi] = React.useState(false);
  const [aiSuggestions, setAiSuggestions] = React.useState<ReminderSuggestion[] | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const {
    data: detail,
    isLoading,
    error,
  } = useSupabaseQuery<Detail | null>(
    ['assets', 'asset_categories', 'parts', 'reminders', 'expenses', 'documents', 'profiles'],
    !!id && !!homeId,
    async () => {
      if (!id || !homeId) return null;
      const [
        assetResult,
        categoryResult,
        partsResult,
        remindersResult,
        expensesResult,
        documentsResult,
      ] = await Promise.all([
        db.from('assets').select('*').eq('id', id).eq('home_id', homeId).maybeSingle(),
        db.from('asset_categories').select('*').eq('home_id', homeId),
        db.from('parts').select('*').eq('asset_id', id).eq('home_id', homeId),
        db.from('reminders').select('*').eq('asset_id', id).eq('home_id', homeId),
        db.from('expenses').select('*').eq('asset_id', id).eq('home_id', homeId),
        db.from('documents').select('*').eq('asset_id', id).eq('home_id', homeId),
      ]);
      if (assetResult.error) throw assetResult.error;
      if (!assetResult.data) return null;
      const asset = assetResult.data as AssetRecord;
      const categories = (categoryResult.data ?? []) as AssetCategory[];
      const sourceDocuments = documentsResult.data ?? [];
      const uploaderIds = [
        ...new Set(
          sourceDocuments.flatMap((document) =>
            document.uploaded_by_id ? [document.uploaded_by_id] : []
          )
        ),
      ];
      const uploaderResult = uploaderIds.length
        ? await db.from('profiles').select('user_id,display_name').in('user_id', uploaderIds)
        : { data: [], error: null };
      const uploaderNames = new Map(
        (uploaderResult.data ?? []).map((profile) => [profile.user_id, profile.display_name])
      );
      const documents = (await Promise.all(
        sourceDocuments.map(async (document) => ({
          ...document,
          uploaded_by: document.uploaded_by_id
            ? { display_name: uploaderNames.get(document.uploaded_by_id) ?? null }
            : null,
          url: await signedDocumentUrl(document.storage_path, document.uploaded_by_id, user?.id),
        }))
      )) as AssetDocument[];
      return {
        asset,
        category: categories.find((category) => category.id === asset.category_id) ?? null,
        parts: partsResult.data ?? [],
        reminders: remindersResult.data ?? [],
        expenses: expensesResult.data ?? [],
        documents,
      };
    },
    [id, homeId, user?.id]
  );
  const { data: acceptedReminders } = useSupabaseQuery<{ auto_key: string | null }[]>(
    ['reminders'],
    !!homeId,
    async () => {
      if (!homeId) return [];
      const { data, error: queryError } = await db
        .from('reminders')
        .select('auto_key')
        .eq('home_id', homeId)
        .eq('source', 'auto');
      if (queryError) throw queryError;
      return (data ?? []) as unknown as { auto_key: string | null }[];
    },
    [homeId]
  );
  const acceptedKeys = (acceptedReminders ?? [])
    .map((reminder) => reminder.auto_key)
    .filter((key): key is string => !!key);

  async function deleteAsset() {
    if (!detail || !homeId) return;
    for (const document of detail.documents)
      await deleteDocument(document.id, document.storage_path, homeId);
    const { error: deleteError } = await db
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('home_id', homeId);
    if (deleteError) throw deleteError;
    router.back();
  }

  if (isLoading && !detail)
    return (
      <FormScreen>
        <Stack.Screen
          options={{
            title: 'Asset',
            headerShown: true,
            headerLeft: () => <ScreenBackButton fallbackHref="/assets" />,
          }}
        />
        <Skeleton className="h-32 w-full rounded-[28px]" />
        <Skeleton className="h-24 w-full rounded-[28px]" />
        <Skeleton className="h-24 w-full rounded-[28px]" />
      </FormScreen>
    );

  if (!detail)
    return (
      <FormScreen>
        <Stack.Screen
          options={{
            title: 'Asset',
            headerShown: true,
            headerLeft: () => <ScreenBackButton fallbackHref="/assets" />,
          }}
        />
        <View className="items-center justify-center gap-4 rounded-[32px] bg-muted/40 p-8">
          <Text className="text-center font-medium text-muted-foreground">
            {error ? `Could not load asset: ${error.message}` : 'Asset not found.'}
          </Text>
          <Button variant="outline" onPress={() => router.replace('/assets')}>
            <Text>Back to assets</Text>
          </Button>
        </View>
      </FormScreen>
    );

  const { asset, category } = detail;
  const assetTitle =
    asset.asset_type === 'vehicle'
      ? `${asset.year ?? ''} ${asset.make ?? ''} ${asset.model ?? ''}`.trim()
      : (asset.name ?? 'Asset');
  const categoryName = category?.name ?? 'Uncategorized';
  const brand = asset.asset_type === 'vehicle' ? (asset.make ?? '') : (asset.brand ?? '');
  const modelNumber =
    asset.asset_type === 'vehicle' ? (asset.model ?? '') : (asset.model_number ?? '');

  async function handleGenerateAiReminders() {
    if (!detail || !homeId) return;
    setGeneratingAi(true);
    setAiError(null);
    try {
      const { data: sessionData } = await db.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in to generate AI upkeep ideas.');
      }
      const res = await getComprehensiveReminders(
        asset.asset_type === 'vehicle'
          ? {
              assetId: asset.id,
              assetType: 'vehicle',
              vehicle: {
                year: asset.year ?? 0,
                make: asset.make ?? '',
                model: asset.model ?? '',
                trim: asset.trim ?? undefined,
                mileage: asset.mileage ?? undefined,
              },
            }
          : {
              assetId: asset.id,
              assetType: 'general',
              general: {
                name: asset.name ?? '',
                categoryName: category?.name ?? '',
                legacyKind: category?.legacy_kind ?? undefined,
                brand: asset.brand ?? undefined,
                model_number: asset.model_number ?? undefined,
                serial_number: asset.serial_number ?? undefined,
                install_date: asset.install_date ?? undefined,
                location_in_home: asset.location_in_home ?? undefined,
              },
            },
        token
      );
      setAiSuggestions(res);
    } catch (err: unknown) {
      console.warn('AI suggestions error:', err);
      const msg = err instanceof Error ? err.message : 'Could not generate AI upkeep ideas.';
      setAiError(msg);
    } finally {
      setGeneratingAi(false);
    }
  }

  const baseSuggestions =
    asset.asset_type === 'vehicle'
      ? [
          ...vehicleSuggestions({ mileage: asset.mileage ?? 0, assetId: asset.id }),
          warrantySuggestion(assetTitle, asset.warranty_expires_at, asset.id),
        ].filter((value): value is NonNullable<typeof value> => !!value)
      : generalAssetSuggestions({
          legacyKind: category?.legacy_kind as LegacyAssetKind | null,
          install_date: asset.install_date,
          assetId: asset.id,
          name: asset.name,
          categoryName: category?.name,
        });

  const suggestions = aiSuggestions ?? baseSuggestions;
  const availableSuggestions = suggestions.filter((s) => !acceptedKeys.includes(s.key));

  return (
    <>
      <Stack.Screen
        options={{
          title: assetTitle,
          headerShown: true,
          headerLeft: () => <ScreenBackButton fallbackHref="/assets" />,
          headerRight: () => (
            <Link href={{ pathname: '/assets/edit', params: { id: asset.id } }} asChild>
              <Button size="sm" variant="ghost">
                <Text>Edit</Text>
              </Button>
            </Link>
          ),
        }}
      />
      <FormScreen>
        <Card className="pb-4">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="gap-1">
            <SpecRow label="Category" value={categoryName} />
            {asset.asset_type === 'vehicle' ? (
              <>
                <SpecRow label="Year" value={asset.year} />
                <SpecRow label="Make" value={asset.make} />
                <SpecRow label="Model" value={asset.model} />
                <SpecRow label="Trim" value={asset.trim} />
                <SpecRow
                  label="Mileage"
                  value={asset.mileage != null ? `${asset.mileage.toLocaleString()} mi` : null}
                />
                <SpecRow label="VIN" value={asset.vin} />
              </>
            ) : (
              <>
                <SpecRow label="Brand" value={asset.brand} />
                <SpecRow label="Model" value={asset.model_number} />
                <SpecRow label="Serial" value={asset.serial_number} />
                <SpecRow label="Location" value={asset.location_in_home} />
                <SpecRow
                  label="Installed"
                  value={
                    asset.install_date ? new Date(asset.install_date).toLocaleDateString() : null
                  }
                />
              </>
            )}
          </CardContent>
        </Card>
        <WarrantyRegistrationCard
          brand={brand}
          modelNumber={modelNumber}
          warrantyExpiresAt={asset.warranty_expires_at}
          purchaseDate={asset.purchase_date}
          purchasePriceCents={asset.purchase_price_cents}
          registrationStatus={asset.registration_status}
          registeredAt={asset.registered_at}
          registrationConfirmation={asset.registration_confirmation}
        />
        {homeId && profileId ? (
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upkeep & Reminders
              </Text>
              <Button
                size="sm"
                variant="outline"
                disabled={generatingAi}
                className="h-8 flex-row gap-1.5 px-2.5"
                onPress={handleGenerateAiReminders}>
                <Icon as={Sparkles} className="size-3.5 text-primary" />
                <Text className="text-xs">{generatingAi ? 'Analyzing…' : 'AI Upkeep Ideas'}</Text>
              </Button>
            </View>

            {aiError ? (
              <Card className="rounded-[24px] border border-destructive/20 bg-destructive/10 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="size-8 items-center justify-center rounded-full bg-destructive/20">
                    <Icon as={AlertCircle} className="size-4 text-destructive" />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-semibold text-destructive">
                      Could not generate upkeep ideas
                    </Text>
                    <Text className="text-xs text-destructive/80">{aiError}</Text>
                  </View>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-destructive/30 px-2.5"
                    disabled={generatingAi}
                    onPress={handleGenerateAiReminders}>
                    <Text className="text-xs font-medium text-destructive">Retry</Text>
                  </Button>
                </View>
              </Card>
            ) : null}

            {!aiError && aiSuggestions !== null && availableSuggestions.length === 0 ? (
              <Card className="rounded-[24px] border border-black/[0.04] bg-muted/40 p-4 dark:border-white/5 dark:bg-[#1E2026]/40">
                <View className="flex-row items-center gap-3">
                  <View className="size-8 items-center justify-center rounded-full bg-primary/10">
                    <Icon as={Sparkles} className="size-4 text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {aiSuggestions.length === 0
                        ? 'No upkeep ideas found'
                        : 'All upkeep ideas are already scheduled'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      {aiSuggestions.length === 0
                        ? 'No specific upkeep tasks were found for this item. You can add custom reminders below.'
                        : 'All recommendations from this search are already active in your reminders schedule.'}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {!aiError && aiSuggestions === null && availableSuggestions.length === 0 ? (
              <Card className="rounded-[24px] border border-dashed border-black/[0.08] bg-muted/20 p-4 dark:border-white/10 dark:bg-transparent">
                <View className="flex-row items-center gap-3">
                  <View className="size-8 items-center justify-center rounded-full bg-muted">
                    <Icon as={Sparkles} className="size-4 text-muted-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">
                      Tailored upkeep schedule
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      Click &ldquo;AI Upkeep Ideas&rdquo; to analyze this{' '}
                      {asset.asset_type === 'vehicle' ? 'vehicle' : 'equipment'} and generate custom
                      maintenance reminders.
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            <ReminderSuggestions
              suggestions={suggestions}
              homeId={homeId}
              link={{ asset: asset.id }}
              existingKeys={acceptedKeys}
              title={
                aiSuggestions
                  ? 'AI recommended upkeep'
                  : asset.asset_type === 'vehicle'
                    ? 'Vehicle upkeep'
                    : 'Asset upkeep'
              }
              description="Recommended upkeep based on your equipment. Uncheck anything you don't need."
            />
          </View>
        ) : null}
        <AssetPartsCard
          assetType={asset.asset_type as AssetTemplate}
          assetId={asset.id}
          homeId={asset.home_id}
          parts={detail.parts}
          categoryName={categoryName}
        />
        <AssetExpensesCard
          assetType={asset.asset_type as AssetTemplate}
          assetId={asset.id}
          expenses={detail.expenses}
          categoryName={categoryName}
        />
        <AssetDocumentsCard
          assetType={asset.asset_type as AssetTemplate}
          assetId={asset.id}
          documents={detail.documents}
          userId={user?.id}
          homeId={homeId ?? undefined}
          profileId={profileId ?? undefined}
          categoryName={categoryName}
        />
        <Card className="pb-4">
          <CardHeader>
            <CardTitle>Reminders</CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            {detail.reminders.length ? (
              detail.reminders.map((reminder) => (
                <View
                  key={reminder.id}
                  className="flex-row items-center justify-between rounded-2xl bg-muted/40 px-4 py-3 dark:bg-[#1E2026]/40">
                  <Text className="text-sm font-medium text-foreground">{reminder.title}</Text>
                </View>
              ))
            ) : (
              <Text className="text-muted-foreground">No reminders yet.</Text>
            )}
          </CardContent>
        </Card>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Text>Delete Asset</Text>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {assetTitle} and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Text>Cancel</Text>
              </AlertDialogCancel>
              <AlertDialogAction onPress={deleteAsset}>
                <Text>Delete</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </FormScreen>
    </>
  );
}
