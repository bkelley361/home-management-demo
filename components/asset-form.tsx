import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, Image as ImageIcon, Package, Sparkles } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { useSupabaseQuery } from '@/lib/use-supabase-query';
import { supabase as db } from '@/lib/supabase';
import { scanAssetTag } from '@/lib/scan-asset';
import { autoScheduleAssetReminders } from '@/lib/ai-reminders';
import {
  generalAssetSuggestions,
  type LegacyAssetKind,
  vehicleSuggestions,
} from '@/lib/reminder-suggestions';
import { Switch } from '@/components/ui/switch';
import {
  AssetCategoryEditor,
  ASSET_CATEGORY_ICONS,
  type AssetCategory,
  type AssetTemplate,
} from '@/components/asset-category-editor';
import {
  WarrantyRegistrationFields,
  type WarrantyRegistrationValues,
} from '@/components/warranty-registration-fields';
import { centsToInputValue, parseAmountToCents } from '@/lib/money';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form-error';
import { FormScreen } from '@/components/ui/form-screen';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalCloseButton } from '@/components/ui/modal-close-button';
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
import type { Tables, TablesInsert } from '@/lib/database.types';

type AssetRecord = Tables<'assets'>;

type FormState = {
  name: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  mileage: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  installDate?: string;
  location: string;
  purchaseDate?: string;
  extras: WarrantyRegistrationValues;
};

const emptyForm = (): FormState => ({
  name: '',
  vin: '',
  year: '',
  make: '',
  model: '',
  trim: '',
  mileage: '',
  brand: '',
  modelNumber: '',
  serialNumber: '',
  location: '',
  extras: {
    purchasePrice: '',
    registrationStatus: null,
    registrationConfirmation: '',
  },
});
const dateValue = (timestamp: number | null) =>
  timestamp ? new Date(timestamp).toISOString() : undefined;
const timeValue = (value?: string) => (value ? new Date(value).getTime() : null);
export function AssetForm({ editing = false }: { editing?: boolean }) {
  const { id, categoryId } = useLocalSearchParams<{ id?: string; categoryId?: string }>();
  const { homeId } = useCurrentHome();
  const [state, setState] = React.useState<FormState>(emptyForm);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [assetType, setAssetType] = React.useState<AssetTemplate | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [decoding, setDecoding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [scanSuccess, setScanSuccess] = React.useState<string | null>(null);
  const [autoAddReminders, setAutoAddReminders] = React.useState(true);
  const seededFor = React.useRef<string | null>(null);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refresh: refreshCategories,
  } = useSupabaseQuery<AssetCategory[]>(
    ['asset_categories'],
    !!homeId,
    async () => {
      if (!homeId) return [];
      const { data, error: queryError } = await db
        .from('asset_categories')
        .select('*')
        .eq('home_id', homeId)
        .order('name');
      if (queryError) throw queryError;
      return (data ?? []) as unknown as AssetCategory[];
    },
    [homeId]
  );
  const { data: asset, isLoading: assetLoading } = useSupabaseQuery<Tables<'assets'> | null>(
    ['assets'],
    !!editing && !!id && !!homeId,
    async () => {
      if (!id || !homeId) return null;
      const { data, error: queryError } = await db
        .from('assets')
        .select('*')
        .eq('id', id)
        .eq('home_id', homeId)
        .maybeSingle();
      if (queryError) throw queryError;
      return data ?? null;
    },
    [editing, id, homeId]
  );

  React.useEffect(() => {
    const category = categories.find((item) => item.id === categoryId);
    if (!editing && category) {
      setSelectedCategoryId(category.id);
      setAssetType(category.asset_type as AssetTemplate);
    }
  }, [categoryId, categories, editing]);
  React.useEffect(() => {
    if (!editing || !asset || seededFor.current === asset.id) return;
    seededFor.current = asset.id;
    setAssetType(asset.asset_type as AssetTemplate);
    setSelectedCategoryId(asset.category_id);
    setState({
      name: asset.name ?? '',
      vin: asset.vin ?? '',
      year: asset.year?.toString() ?? '',
      make: asset.make ?? '',
      model: asset.model ?? '',
      trim: asset.trim ?? '',
      mileage: asset.mileage?.toString() ?? '',
      brand: asset.brand ?? '',
      modelNumber: asset.model_number ?? '',
      serialNumber: asset.serial_number ?? '',
      installDate: dateValue(asset.install_date ?? null),
      location: asset.location_in_home ?? '',
      extras: {
        purchaseDate: dateValue(asset.purchase_date),
        warrantyExpiresAt: dateValue(asset.warranty_expires_at),
        purchasePrice: centsToInputValue(asset.purchase_price_cents),
        registrationStatus:
          asset.registration_status as WarrantyRegistrationValues['registrationStatus'],
        registeredAt: dateValue(asset.registered_at),
        registrationConfirmation: asset.registration_confirmation ?? '',
      },
    });
  }, [editing, asset]);

  const visibleCategories = assetType
    ? categories.filter((category) => category.asset_type === assetType)
    : categories;
  const currentCategory = categories.find((category) => category.id === selectedCategoryId);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
  }
  function updateExtra<K extends keyof WarrantyRegistrationValues>(
    key: K,
    value: WarrantyRegistrationValues[K]
  ) {
    setState((previous) => ({ ...previous, extras: { ...previous.extras, [key]: value } }));
  }

  async function decodeVin() {
    const vin = state.vin.trim();
    if (!vin) {
      setError('Enter a VIN to decode.');
      return;
    }
    setDecoding(true);
    setError(null);
    try {
      const response = await fetch(
        `https://vpic.nhtsa.gov/api/vehicles/decodevinvalues/${vin}?format=json`
      );
      if (!response.ok) throw new Error('Failed to decode VIN. Please check your connection.');
      const json = await response.json();
      const result = json?.Results?.[0];
      if (!result) {
        setError('Could not decode that VIN.');
        return;
      }
      setState((previous) => ({
        ...previous,
        year: result.ModelYear || previous.year,
        make: result.Make || previous.make,
        model: result.Model || previous.model,
        trim: result.Trim || previous.trim,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Failed to decode VIN. Please check your connection.'
      );
    } finally {
      setDecoding(false);
    }
  }

  async function handleScan(source: 'camera' | 'library') {
    setError(null);
    setScanSuccess(null);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera permission is required to scan equipment tags.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          base64: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Photo library permission is required to select an image.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
      }

      if (result.canceled || !result.assets?.[0]?.base64) return;
      const assetFile = result.assets[0];
      const base64Data = assetFile.base64;
      if (!base64Data) return;

      setScanning(true);
      const { data: sessionData } = await db.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Please sign in to use AI scan.');

      const scanned = await scanAssetTag({
        imageBase64: base64Data,
        mimeType: assetFile.mimeType ?? 'image/jpeg',
        authToken: token,
        hintAssetType: assetType ?? undefined,
      });

      if (scanned.detected_type === 'vehicle') {
        setAssetType('vehicle');
        const vehicleCat = categories.find((c) => c.asset_type === 'vehicle');
        if (vehicleCat && (!selectedCategoryId || currentCategory?.asset_type !== 'vehicle')) {
          setSelectedCategoryId(vehicleCat.id);
        }
        setState((prev) => ({
          ...prev,
          vin: scanned.vin ?? prev.vin,
          year: scanned.year ? String(scanned.year) : prev.year,
          make: scanned.make ?? prev.make,
          model: scanned.model ?? prev.model,
          trim: scanned.trim ?? prev.trim,
        }));
        setScanSuccess(scanned.summary);
      } else {
        setAssetType('general');
        if (scanned.suggested_category) {
          const matchCat = categories.find(
            (c) =>
              c.asset_type === 'general' &&
              c.name.toLowerCase().includes(scanned.suggested_category!.toLowerCase())
          );
          if (matchCat) {
            setSelectedCategoryId(matchCat.id);
          }
        }
        setState((prev) => ({
          ...prev,
          name: scanned.suggested_name ?? prev.name,
          brand: scanned.brand ?? prev.brand,
          modelNumber: scanned.model_number ?? prev.modelNumber,
          serialNumber: scanned.serial_number ?? prev.serialNumber,
        }));
        setScanSuccess(scanned.summary);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  }

  async function submit() {
    if (!homeId || !assetType) {
      setError('Choose a category to select an item form.');
      return;
    }
    if (!editing && !selectedCategoryId) {
      setError('Choose a category for this item.');
      return;
    }
    if (
      selectedCategoryId &&
      !visibleCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setError('Choose a category with the matching item form.');
      return;
    }
    const vehicleValues = assetType === 'vehicle';
    const yearNumber = Number(state.year);
    const mileageNumber = state.mileage.trim() === '' ? 0 : Number(state.mileage);
    if (vehicleValues) {
      if (
        !state.year.trim() ||
        !Number.isInteger(yearNumber) ||
        !state.make.trim() ||
        !state.model.trim()
      ) {
        setError('Please fill out a valid year, make, and model.');
        return;
      }
      if (!Number.isInteger(mileageNumber) || mileageNumber < 0) {
        setError('Enter a valid non-negative mileage.');
        return;
      }
    } else if (!state.name.trim()) {
      setError('Enter a name for this item.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const lifecycle = lifecycleValues(state);
      const values: TablesInsert<'assets'> = vehicleValues
        ? {
            home_id: homeId,
            category_id: selectedCategoryId,
            asset_type: 'vehicle',
            name: null,
            vin: state.vin.trim() || null,
            year: yearNumber,
            make: state.make.trim(),
            model: state.model.trim(),
            trim: state.trim.trim() || null,
            mileage: mileageNumber,
            mileage_updated_at:
              editing && asset && state.mileage === String(asset.mileage ?? 0)
                ? asset.mileage_updated_at
                : Date.now(),
            brand: null,
            model_number: null,
            serial_number: null,
            install_date: null,
            location_in_home: null,
            ...lifecycle,
          }
        : {
            home_id: homeId,
            category_id: selectedCategoryId,
            asset_type: 'general',
            name: state.name.trim(),
            vin: null,
            year: null,
            make: null,
            model: null,
            trim: null,
            mileage: null,
            mileage_updated_at: null,
            brand: state.brand.trim() || null,
            model_number: state.modelNumber.trim() || null,
            serial_number: state.serialNumber.trim() || null,
            install_date: timeValue(state.installDate),
            location_in_home: state.location.trim() || null,
            ...lifecycle,
          };
      const query =
        editing && id
          ? await db
              .from('assets')
              .update(values)
              .eq('id', id)
              .eq('home_id', homeId)
              .select('id')
              .single()
          : await db.from('assets').insert(values).select('id').single();
      if (query.error) throw query.error;
      if (
        !query.data ||
        typeof query.data !== 'object' ||
        !('id' in query.data) ||
        typeof query.data.id !== 'string'
      ) {
        throw new Error('Asset save did not return an ID.');
      }

      const newAssetId = query.data.id;

      // Automatically generate and schedule upkeep reminders for new assets instantly
      if (!editing && autoAddReminders && homeId) {
        try {
          const suggestions = vehicleValues
            ? vehicleSuggestions({
                mileage: mileageNumber,
                assetId: newAssetId,
              })
            : generalAssetSuggestions({
                assetId: newAssetId,
                name: state.name.trim(),
                categoryName: currentCategory?.name ?? 'General',
                legacyKind: (currentCategory?.legacy_kind as LegacyAssetKind) ?? undefined,
                install_date: timeValue(state.installDate) ?? undefined,
              });

          await autoScheduleAssetReminders(homeId, newAssetId, suggestions);
        } catch (reminderErr) {
          console.warn('Could not auto-schedule reminders for new asset:', reminderErr);
        }
      }

      router.replace(`/assets/${newAssetId}` as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  }

  if ((editing && assetLoading) || categoriesLoading)
    return (
      <FormScreen>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </FormScreen>
    );
  if (editing && !asset)
    return (
      <FormScreen>
        <Text>Asset not found.</Text>
      </FormScreen>
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: editing ? 'Edit Asset' : 'Add Asset',
          headerShown: true,
          headerLeft: () => <ModalCloseButton />,
        }}
      />
      <FormScreen
        contentClassName="gap-6 px-5 pt-6"
        footer={
          <>
            <FormError message={error} />
            <Button onPress={submit} disabled={saving || scanning}>
              <Text>{saving ? 'Saving…' : editing ? 'Save Asset' : 'Add Asset'}</Text>
            </Button>
          </>
        }>
        {/* AI Quick Scan Section */}
        <View className="gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <View className="flex-row items-center gap-2">
            <Icon as={Sparkles} className="size-4 text-primary" />
            <Text className="text-sm font-semibold text-foreground">AI Quick Scan</Text>
          </View>
          <Text className="text-xs leading-relaxed text-muted-foreground">
            Snap a photo of an appliance rating plate, HVAC data tag, or vehicle VIN sticker to
            auto-fill this form.
          </Text>
          <View className="flex-row gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              className="flex-1 flex-row gap-2"
              disabled={scanning || saving}
              onPress={() => handleScan('camera')}>
              <Icon as={Camera} className="size-4" />
              <Text>{scanning ? 'Scanning…' : 'Take Photo'}</Text>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex-row gap-2"
              disabled={scanning || saving}
              onPress={() => handleScan('library')}>
              <Icon as={ImageIcon} className="size-4" />
              <Text>Upload Image</Text>
            </Button>
          </View>
          {scanSuccess ? (
            <View className="flex-row items-center gap-1.5 pt-1">
              <Icon as={CheckCircle2} className="size-4 text-green-600" />
              <Text className="flex-1 text-xs font-medium text-green-600">{scanSuccess}</Text>
            </View>
          ) : null}
        </View>

        {/* Category section */}
        <View className="gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Category
          </Text>
          <Select
            value={
              selectedCategoryId
                ? { value: selectedCategoryId, label: currentCategory?.name ?? 'Category' }
                : editing
                  ? { value: '__uncategorized__', label: 'Uncategorized' }
                  : undefined
            }
            onValueChange={(option) => {
              if (option?.value === '__uncategorized__') {
                setSelectedCategoryId(null);
                return;
              }
              const next = visibleCategories.find((category) => category.id === option?.value);
              setSelectedCategoryId(option?.value ?? null);
              setAssetType(next?.asset_type ?? assetType);
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {visibleCategories.map((category) => {
                const CategoryIcon =
                  ASSET_CATEGORY_ICONS[category.icon_key as keyof typeof ASSET_CATEGORY_ICONS] ??
                  Package;
                return (
                  <SelectItem key={category.id} value={category.id} label={category.name}>
                    <View className="flex-row items-center gap-2">
                      <Icon as={CategoryIcon} size={16} />
                      <Text>{category.name}</Text>
                    </View>
                  </SelectItem>
                );
              })}
              {editing ? (
                <SelectItem value="__uncategorized__" label="Uncategorized">
                  <Text>Uncategorized</Text>
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
          {!editing ? (
            <Button size="sm" variant="outline" onPress={() => setCreateCategoryOpen(true)}>
              <Text>Add category</Text>
            </Button>
          ) : null}
          {assetType ? (
            <Text className="text-xs text-muted-foreground">
              {assetType === 'vehicle' ? 'Vehicle' : 'General'} item form
            </Text>
          ) : null}
        </View>

        {assetType === 'vehicle' ? (
          <>
            {/* Decode by VIN section */}
            <View className="gap-3 pt-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Decode by VIN
              </Text>
              <View className="gap-1.5">
                <Label htmlFor="asset-vin">VIN</Label>
                <Input
                  id="asset-vin"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={state.vin}
                  onChangeText={(value) => update('vin', value)}
                />
              </View>
              <Button variant="outline" onPress={decodeVin} disabled={decoding}>
                <Text>{decoding ? 'Decoding…' : 'Decode VIN'}</Text>
              </Button>
            </View>

            {/* Vehicle details section */}
            <View className="gap-3 pt-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Vehicle details
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Label htmlFor="asset-year">Year</Label>
                  <Input
                    id="asset-year"
                    keyboardType="number-pad"
                    value={state.year}
                    onChangeText={(value) => update('year', value)}
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label htmlFor="asset-mileage">Mileage</Label>
                  <Input
                    id="asset-mileage"
                    keyboardType="number-pad"
                    value={state.mileage}
                    onChangeText={(value) => update('mileage', value)}
                  />
                </View>
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-make">Make</Label>
                <Input
                  id="asset-make"
                  value={state.make}
                  onChangeText={(value) => update('make', value)}
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-model">Model</Label>
                <Input
                  id="asset-model"
                  value={state.model}
                  onChangeText={(value) => update('model', value)}
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-trim">Trim (optional)</Label>
                <Input
                  id="asset-trim"
                  value={state.trim}
                  onChangeText={(value) => update('trim', value)}
                />
              </View>
            </View>
          </>
        ) : assetType === 'general' ? (
          <>
            {/* Item details section */}
            <View className="gap-3 pt-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Item details
              </Text>
              <View className="gap-1.5">
                <Label htmlFor="asset-name">Name</Label>
                <Input
                  id="asset-name"
                  value={state.name}
                  onChangeText={(value) => update('name', value)}
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-brand">Brand (optional)</Label>
                <Input
                  id="asset-brand"
                  value={state.brand}
                  onChangeText={(value) => update('brand', value)}
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-model-number">Model number (optional)</Label>
                <Input
                  id="asset-model-number"
                  value={state.modelNumber}
                  onChangeText={(value) => update('modelNumber', value)}
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-serial-number">Serial number (optional)</Label>
                <Input
                  id="asset-serial-number"
                  value={state.serialNumber}
                  onChangeText={(value) => update('serialNumber', value)}
                />
              </View>
              <View className="gap-1.5">
                <Label htmlFor="asset-location">Location in home (optional)</Label>
                <Input
                  id="asset-location"
                  value={state.location}
                  onChangeText={(value) => update('location', value)}
                />
              </View>
            </View>

            {/* Install date section */}
            <View className="gap-3 pt-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Install date (optional)
              </Text>
              <Calendar
                mode="single"
                date={state.installDate}
                onChange={({ date }) => date && update('installDate', String(date))}
              />
            </View>
          </>
        ) : null}

        {assetType ? (
          <WarrantyRegistrationFields
            assetNoun={assetType === 'vehicle' ? 'vehicle' : 'item'}
            values={state.extras}
            onChange={updateExtra}
          />
        ) : null}

        {!editing ? (
          <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-black/10 bg-muted/30 p-4 dark:border-white/10">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5">
                <Icon as={Sparkles} className="size-4 text-primary" />
                <Text className="text-sm font-semibold">Auto-schedule Upkeep Reminders</Text>
              </View>
              <Text className="text-xs leading-relaxed text-muted-foreground">
                Automatically create tailored maintenance reminders for this{' '}
                {assetType === 'vehicle' ? 'vehicle' : 'item'}.
              </Text>
            </View>
            <Switch checked={autoAddReminders} onCheckedChange={setAutoAddReminders} />
          </View>
        ) : null}
      </FormScreen>
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="max-h-[85vh] w-[92vw] max-w-sm overflow-hidden rounded-[32px] p-0 sm:max-w-md">
          <DialogHeader className="px-6 pb-2 pt-6">
            <DialogTitle className="text-xl font-bold">New Category</DialogTitle>
          </DialogHeader>
          <KeyboardAwareScrollView
            className="max-h-[70vh] w-full px-6 pb-6"
            contentClassName="pb-4 w-full"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            horizontal={false}
            style={{ overflowX: 'hidden' }}>
            <AssetCategoryEditor
              submitLabel="Save"
              onCancel={() => setCreateCategoryOpen(false)}
              onSaved={(category) => {
                setCreateCategoryOpen(false);
                setSelectedCategoryId(category.id);
                setAssetType(category.asset_type);
                refreshCategories();
              }}
            />
          </KeyboardAwareScrollView>
        </DialogContent>
      </Dialog>
    </>
  );
}

function lifecycleValues(state: FormState) {
  const extras = state.extras;
  return {
    purchase_date: timeValue(extras.purchaseDate ?? state.purchaseDate),
    warranty_expires_at: timeValue(extras.warrantyExpiresAt),
    purchase_price_cents: parseAmountToCents(extras.purchasePrice),
    registration_status: extras.registrationStatus,
    registered_at: timeValue(extras.registeredAt),
    registration_confirmation: extras.registrationConfirmation.trim() || null,
  };
}
