import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ExternalLink, Search } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';

import { ReminderSuggestions } from '@/components/reminder-suggestions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalCloseButton } from '@/components/ui/modal-close-button';
import { RecurrencePicker } from '@/components/ui/recurrence-picker';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useSupabaseQuery } from '@/lib/use-supabase-query';
import {
  lookupParts,
  quickPicks,
  type GeneralIdentity,
  type PartCandidate,
  type PartsLookupRequest,
  type PartsLookupResult,
  type VehicleIdentity,
} from '@/lib/parts-lookup';
import { partSuggestion, type ReminderSuggestion } from '@/lib/reminders';
import { useCurrentHome } from '@/lib/use-current-home';
import { savedPartLink } from '@/lib/vendor-links';

type AssetType = 'vehicle' | 'general';

type LookupAsset = {
  id: string;
  asset_type: AssetType;
  name: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number | null;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  install_date: number | null;
  location_in_home: string | null;
  category: { name: string; legacy_kind: string | null } | null;
};

const CONFIDENCE_LABELS: Record<PartCandidate['confidence'], string> = {
  high: 'Confident',
  medium: 'Likely fit',
  low: 'Verify first',
};

export default function PartsLookupScreen() {
  const params = useLocalSearchParams<{ assetId: string }>();
  const assetId = params.assetId;

  const { homeId } = useCurrentHome();
  const { data: acceptedReminders } = useSupabaseQuery<Tables<'reminders'>[]>(
    ['reminders'],
    !!homeId,
    async () => {
      if (!homeId) return [];
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('home_id', homeId)
        .eq('source', 'auto');
      if (error) throw error;
      return data ?? [];
    },
    [homeId]
  );
  const acceptedKeys = (acceptedReminders ?? [])
    .map((reminder) => reminder.auto_key)
    .filter((key): key is string => !!key);

  const { data: asset } = useSupabaseQuery<LookupAsset | null>(
    ['assets', 'asset_categories'],
    !!assetId && !!homeId,
    async () => {
      if (!assetId || !homeId) return null;
      const { data, error } = await supabase
        .from('assets')
        .select('*,category:asset_categories(name,legacy_kind)')
        .eq('id', assetId)
        .eq('home_id', homeId)
        .maybeSingle();
      if (error) throw error;
      return (data as LookupAsset | null) ?? null;
    },
    [assetId, homeId]
  );
  const assetType: AssetType = asset?.asset_type ?? 'vehicle';
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PartsLookupResult | null>(null);
  const [lastQuery, setLastQuery] = React.useState('');
  const [savedParts, setSavedParts] = React.useState<Record<string, boolean>>({});

  const assetLabel = asset
    ? assetType === 'vehicle'
      ? [asset.year, asset.make, asset.model, asset.trim].filter(Boolean).join(' ')
      : (asset.name ?? '')
    : '';
  const legacyKind = asset?.category?.legacy_kind ?? undefined;
  const picks = quickPicks(assetType, legacyKind);

  async function runLookup(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !asset) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError('Please sign in again to use parts lookup.');
        return;
      }
      await runLookupWithToken(trimmed, token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Please sign in again to use parts lookup.');
    }
  }

  async function runLookupWithToken(trimmed: string, token: string) {
    if (!asset) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSavedParts({});
    setLastQuery(trimmed);

    try {
      const lookupInput: PartsLookupRequest =
        assetType === 'vehicle'
          ? {
              assetType,
              query: trimmed,
              vehicle: {
                year: asset.year ?? 0,
                make: asset.make ?? '',
                model: asset.model ?? '',
                trim: asset.trim ?? undefined,
                mileage: asset.mileage ?? undefined,
              },
            }
          : {
              assetType,
              query: trimmed,
              general: {
                name: asset.name ?? '',
                categoryName: asset.category?.name ?? 'Uncategorized',
                legacyKind,
                brand: asset.brand ?? undefined,
                model_number: asset.model_number ?? undefined,
                install_date: asset.install_date ?? undefined,
                serial_number: asset.serial_number ?? undefined,
                location_in_home: asset.location_in_home ?? undefined,
              },
            };
      const lookup = await lookupParts(lookupInput, token);
      setResult(lookup);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  /** Key candidates by name + index so identically named options stay distinct. */
  function partKey(part: PartCandidate, index: number) {
    return `${part.part_name}-${index}`;
  }

  const [schedulingKey, setSchedulingKey] = React.useState<string | null>(null);
  const [scheduleRule, setScheduleRule] = React.useState('none');
  const [lastReplaced, setLastReplaced] = React.useState<string | undefined>(undefined);
  const [savedSuggestion, setSavedSuggestion] = React.useState<{
    partId: string;
    suggestion: ReminderSuggestion;
  } | null>(null);

  function openSchedule(part: PartCandidate, index: number) {
    setSchedulingKey(partKey(part, index));
    setScheduleRule('none');
    setLastReplaced(undefined);
  }

  async function savePart(part: PartCandidate, index: number) {
    if (!assetId || !homeId || !asset) return;

    const identity: GeneralIdentity | VehicleIdentity =
      assetType === 'vehicle'
        ? {
            year: asset.year ?? 0,
            make: asset.make ?? '',
            model: asset.model ?? '',
            trim: asset.trim ?? undefined,
          }
        : {
            name: asset.name ?? '',
            categoryName: asset.category?.name ?? 'Uncategorized',
            legacyKind,
            brand: asset.brand ?? undefined,
            model_number: asset.model_number ?? undefined,
          };

    const sourceLink = savedPartLink(assetType, identity, part, lastQuery);
    const lastReplacedAt = lastReplaced ? new Date(lastReplaced).getTime() : null;
    const { data: savedPart, error: insertError } = await supabase
      .from('parts')
      .insert({
        home_id: homeId,
        asset_id: assetId,
        part_name: part.part_name,
        part_number: part.part_number || null,
        brand: part.brand || null,
        notes: part.notes || null,
        source_link: sourceLink,
        replacement_rule: scheduleRule !== 'none' ? scheduleRule : null,
        last_replaced_date: lastReplacedAt,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    setSavedParts((prev) => ({ ...prev, [partKey(part, index)]: true }));
    setSchedulingKey(null);

    const suggestion = partSuggestion(part.part_name, scheduleRule, lastReplacedAt, assetId);
    setSavedSuggestion(suggestion ? { partId: savedPart.id, suggestion } : null);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Find Parts',
          headerShown: true,
          headerLeft: () => <ModalCloseButton />,
        }}
      />

      <FormScreen scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
        <Card className="pb-4">
          <CardHeader className="gap-2">
            <CardTitle>{assetLabel || 'Loading…'}</CardTitle>
            <CardDescription>
              Ask what part or fluid this needs — we&apos;ll look up the specs for this specific
              asset.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  placeholder={assetType === 'vehicle' ? 'oil, brake pads…' : 'filters, batteries…'}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  onSubmitEditing={() => runLookup(query)}
                  returnKeyType="search"
                />
              </View>
              <Button
                size="icon"
                onPress={() => runLookup(query)}
                disabled={isLoading || !query.trim() || !asset}>
                <Icon as={Search} className="size-5" />
              </Button>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {picks.map((pick) => (
                <Pressable
                  key={pick}
                  onPress={() => {
                    setQuery(pick);
                    runLookup(pick);
                  }}
                  disabled={isLoading}>
                  <Badge variant="secondary">
                    <Text>{pick}</Text>
                  </Badge>
                </Pressable>
              ))}
            </View>
          </CardContent>
        </Card>

        <FormError message={error} />

        {isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </View>
        ) : null}

        {result ? (
          <>
            <Card className="pb-4">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="capitalize">{lastQuery}</CardTitle>
                <View className="flex-row gap-1.5">
                  {result.grounded ? (
                    <Badge variant="secondary">
                      <Text className="text-xs">Live Verified</Text>
                    </Badge>
                  ) : null}
                  {result.cached ? (
                    <Badge variant="outline">
                      <Text className="text-xs">Cached</Text>
                    </Badge>
                  ) : null}
                </View>
              </CardHeader>
              <CardContent className="gap-3">
                <Text className="text-base">{result.summary}</Text>

                {result.specs.length > 0 ? (
                  <View className="gap-2">
                    <Separator />
                    {result.specs.map((spec) => (
                      <View key={spec.label} className="flex-row justify-between gap-3">
                        <Text className="text-sm text-muted-foreground">{spec.label}</Text>
                        <Text className="flex-1 text-right text-sm font-medium">{spec.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {result.caveat ? (
                  <View className="rounded-md bg-muted p-3">
                    <Text className="text-sm text-muted-foreground">{result.caveat}</Text>
                  </View>
                ) : null}
              </CardContent>
            </Card>

            {result.parts.length > 0 ? (
              <Card className="pb-4">
                <CardHeader>
                  <CardTitle>Parts that fit</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                  {result.parts.map((part, index) => (
                    <View key={`${part.part_name}-${index}`} className="gap-2">
                      {index > 0 ? <Separator /> : null}
                      <View className="flex-row items-start justify-between gap-2 pt-1">
                        <View className="flex-1 gap-0.5">
                          <Text className="text-base font-medium">{part.part_name}</Text>
                          {part.part_number ? (
                            <Text className="text-sm text-muted-foreground">
                              Part #{part.part_number}
                              {part.brand ? ` · ${part.brand}` : ''}
                            </Text>
                          ) : part.brand ? (
                            <Text className="text-sm text-muted-foreground">{part.brand}</Text>
                          ) : null}
                          {part.notes ? (
                            <Text className="text-sm text-muted-foreground">{part.notes}</Text>
                          ) : null}
                        </View>
                        <Badge variant={part.confidence === 'high' ? 'secondary' : 'outline'}>
                          <Text>{CONFIDENCE_LABELS[part.confidence]}</Text>
                        </Badge>
                      </View>
                      {schedulingKey === partKey(part, index) ? (
                        // Step two: optional replacement schedule before committing.
                        <View className="gap-3 rounded-md bg-muted p-3">
                          <Text className="text-sm text-muted-foreground">
                            Add a replacement schedule so we can remind you. Optional — leave it as
                            &quot;Does not repeat&quot; to just save the part.
                          </Text>
                          <RecurrencePicker
                            value={scheduleRule}
                            onChange={setScheduleRule}
                            allowMileage={assetType === 'vehicle'}
                          />
                          {scheduleRule !== 'none' ? (
                            <View className="gap-1.5">
                              <Label>Last replaced (optional)</Label>
                              <Calendar
                                mode="single"
                                date={lastReplaced}
                                onChange={({ date }) => date && setLastReplaced(String(date))}
                              />
                            </View>
                          ) : null}
                          <View className="flex-row gap-2">
                            <Button size="sm" onPress={() => savePart(part, index)}>
                              <Text>Save part</Text>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => setSchedulingKey(null)}>
                              <Text>Cancel</Text>
                            </Button>
                          </View>
                        </View>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="self-start"
                          disabled={savedParts[partKey(part, index)]}
                          onPress={() => openSchedule(part, index)}>
                          <Text>
                            {savedParts[partKey(part, index)] ? 'Saved' : 'Save to this asset'}
                          </Text>
                        </Button>
                      )}
                    </View>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* Offer a reminder for the interval just saved. Self-hides when the
                suggestion was already accepted. */}
            {savedSuggestion && homeId ? (
              <ReminderSuggestions
                suggestions={[savedSuggestion.suggestion]}
                homeId={homeId}
                link={{ part: savedSuggestion.partId }}
                existingKeys={acceptedKeys}
                title="Remind me to replace it"
                description="Based on the replacement schedule you just set."
              />
            ) : null}

            {result.shopping_links.length > 0 ? (
              <Card className="pb-4">
                <CardHeader className="gap-2">
                  <CardTitle>Where to buy</CardTitle>
                  <CardDescription>
                    Opens a pre-filled search for this{' '}
                    {assetType === 'vehicle' ? 'vehicle' : (asset?.category?.name ?? 'asset')}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-2">
                  {result.shopping_links.map((link) => (
                    <Button
                      key={link.url}
                      variant="outline"
                      className="flex-row gap-2"
                      onPress={() => Linking.openURL(link.url)}>
                      <Icon as={ExternalLink} className="size-4" />
                      <Text>{link.label}</Text>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Button variant="outline" onPress={() => router.back()}>
              <Text>Done</Text>
            </Button>
          </>
        ) : null}
      </FormScreen>
    </>
  );
}
