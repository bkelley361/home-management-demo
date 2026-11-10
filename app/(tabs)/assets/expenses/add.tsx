import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormError } from '@/components/ui/form-error';
import { FormScreen } from '@/components/ui/form-screen';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalCloseButton } from '@/components/ui/modal-close-button';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { EXPENSE_CATEGORIES } from '@/lib/expenses';
import { parseAmountToCents } from '@/lib/money';
import { useCurrentHome } from '@/lib/use-current-home';

type LinkType = 'none' | 'asset';

type ExpenseAsset = {
  id: string;
  asset_type: 'vehicle' | 'general';
  name: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  category: { name: string } | null;
};

export default function AddExpenseScreen() {
  const { homeId, profileId } = useCurrentHome();
  // Pre-scoped when opened from an asset's expenses card.
  const params = useLocalSearchParams<{ assetId?: string }>();
  const [assets, setAssets] = React.useState<ExpenseAsset[]>([]);
  React.useEffect(() => {
    if (!homeId) return;
    let active = true;
    void supabase
      .from('assets')
      .select('id,asset_type,name,year,make,model,category:asset_categories(name)')
      .eq('home_id', homeId)
      .returns<ExpenseAsset[]>()
      .then(({ data }) => {
        if (active && data) setAssets(data);
      });
    return () => {
      active = false;
    };
  }, [homeId]);
  React.useEffect(() => {
    if (!homeId) return;
    const channel = supabase
      .channel(`expense-assets-${homeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets', filter: `home_id=eq.${homeId}` },
        async () => {
          const { data } = await supabase
            .from('assets')
            .select('id,asset_type,name,year,make,model,category:asset_categories(name)')
            .eq('home_id', homeId)
            .returns<ExpenseAsset[]>();
          if (data) setAssets(data);
        }
      )
      .subscribe();
    return () => {
      if (typeof supabase?.removeChannel === 'function') {
        void supabase.removeChannel(channel);
      } else if (channel && typeof channel.unsubscribe === 'function') {
        void channel.unsubscribe();
      }
    };
  }, [homeId]);
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState<string | null>(null);
  const [incurredAt, setIncurredAt] = React.useState<string | undefined>(new Date().toISOString());
  const [description, setDescription] = React.useState('');
  const [vendor, setVendor] = React.useState('');
  const [linkType, setLinkType] = React.useState<LinkType>(params.assetId ? 'asset' : 'none');
  const [linkId, setLinkId] = React.useState<string | null>(params.assetId ?? null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (!homeId || !profileId) return;

    const amountCents = parseAmountToCents(amount);
    if (amountCents === null || amountCents === 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!category) {
      setError('Pick a category.');
      return;
    }
    if (!incurredAt) {
      setError('Pick the date of this expense.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('expenses').insert({
        amount_cents: amountCents,
        category,
        incurred_at: new Date(incurredAt).getTime(),
        description: description.trim() || null,
        vendor: vendor.trim() || null,
        home_id: homeId,
        created_by_id: profileId,
        asset_id: linkType === 'asset' ? linkId : null,
      });
      if (insertError) throw insertError;
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Expense',
          headerShown: true,
          headerLeft: () => <ModalCloseButton />,
        }}
      />

      <FormScreen
        contentClassName="gap-6 px-5 pt-6"
        footer={
          <>
            <FormError message={error} />
            <Button onPress={handleSubmit} disabled={isSubmitting}>
              <Text>{isSubmitting ? 'Saving…' : 'Add Expense'}</Text>
            </Button>
          </>
        }>
        {/* Amount section */}
        <View className="gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Expense details
          </Text>
          <View className="gap-1.5">
            <Label htmlFor="amount">How much?</Label>
            <Input
              id="amount"
              placeholder="149.99"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <View className="gap-1.5">
            <Label htmlFor="description">What was it for? (optional)</Label>
            <Input
              id="description"
              placeholder="Replaced blower motor"
              value={description}
              onChangeText={setDescription}
            />
          </View>
          <View className="gap-1.5">
            <Label htmlFor="vendor">Paid to (optional)</Label>
            <Input id="vendor" placeholder="Ace Hardware" value={vendor} onChangeText={setVendor} />
          </View>
        </View>

        {/* Category section */}
        <View className="gap-3 pt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Category
          </Text>
          <RadioGroup value={category ?? undefined} onValueChange={setCategory}>
            {EXPENSE_CATEGORIES.map((option) => (
              <RadioOption
                key={option.value}
                value={option.value}
                label={option.label}
                nativeID={`expense-category-${option.value}`}
                onSelect={() => setCategory(option.value)}
              />
            ))}
          </RadioGroup>
        </View>

        {/* Date section */}
        <View className="gap-3 pt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Date
          </Text>
          <Calendar
            mode="single"
            date={incurredAt}
            onChange={({ date }) => date && setIncurredAt(String(date))}
          />
        </View>

        {/* Link to section */}
        <View className="gap-3 pt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Link to (optional)
          </Text>
          <RadioGroup
            value={linkType}
            onValueChange={(next) => {
              if (next === 'none' || next === 'asset') {
                setLinkType(next);
                setLinkId(null);
              }
            }}>
            <RadioOption
              value="none"
              label="Nothing"
              nativeID="expense-link-none"
              onSelect={() => {
                setLinkType('none');
                setLinkId(null);
              }}
            />
            <RadioOption
              value="asset"
              label="An asset"
              nativeID="expense-link-asset"
              onSelect={() => {
                setLinkType('asset');
                setLinkId(null);
              }}
            />
          </RadioGroup>

          {linkType === 'asset' && assets.length > 0 ? (
            <RadioGroup value={linkId ?? undefined} onValueChange={setLinkId}>
              {assets.map((asset) => {
                const label =
                  asset.asset_type === 'vehicle'
                    ? `${asset.year ?? ''} ${asset.make ?? ''} ${asset.model ?? ''}`.trim()
                    : `${asset.name ?? ''} · ${asset.category?.name ?? 'Uncategorized'}`;
                return (
                  <RadioOption
                    key={asset.id}
                    value={asset.id}
                    label={label}
                    nativeID={`expense-link-item-${asset.id}`}
                    onSelect={() => setLinkId(asset.id)}
                  />
                );
              })}
            </RadioGroup>
          ) : null}
        </View>
      </FormScreen>
    </>
  );
}
