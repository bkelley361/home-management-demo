import * as React from 'react';
import { Link, Stack } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import type { Tables } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { ScreenBackButton } from '@/components/ui/screen-back-button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { expenseCategoryLabel } from '@/lib/expenses';
import { formatCents, sumCents } from '@/lib/money';
import { useCurrentHome } from '@/lib/use-current-home';

/**
 * Home-wide cost list.
 *
 * Deliberately just a list and a total — this is the "basic entry only" scope.
 * Still scoped to simple entry and totals; detailed cost breakdowns, budgeting,
 * maintenance-vs-replacement analysis, and export remain separate work.
 */
export default function ExpensesScreen() {
  const { homeId } = useCurrentHome();

  const [expenses, setExpenses] = React.useState<
    (Pick<
      Tables<'expenses'>,
      'id' | 'amount_cents' | 'category' | 'incurred_at' | 'description' | 'vendor'
    > & {
      asset:
        | (Pick<Tables<'assets'>, 'asset_type' | 'name' | 'year' | 'make' | 'model'> & {
            category: Pick<Tables<'asset_categories'>, 'name'> | null;
          })
        | null;
    })[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    if (!homeId) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    void supabase
      .from('expenses')
      .select(
        'id,amount_cents,category,incurred_at,description,vendor,asset:assets(asset_type,name,year,make,model,category:asset_categories(name))'
      )
      .eq('home_id', homeId)
      .order('incurred_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error) setExpenses((data as any) ?? []);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [homeId]);
  React.useEffect(() => {
    if (!homeId) return;
    const channel = supabase
      .channel(`expenses-${homeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `home_id=eq.${homeId}` },
        () => {
          void supabase
            .from('expenses')
            .select(
              'id,amount_cents,category,incurred_at,description,vendor,asset:assets(asset_type,name,year,make,model,category:asset_categories(name))'
            )
            .eq('home_id', homeId)
            .order('incurred_at', { ascending: false })
            .then(({ data, error }) => {
              if (!error) setExpenses((data as any) ?? []);
            });
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
  const total = sumCents(expenses.map((e) => e.amount_cents));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Costs',
          headerShown: true,
          headerLeft: () => <ScreenBackButton fallbackHref="/assets" />,
          headerRight: () => (
            <Link href="/assets/expenses/add" asChild>
              <Button size="sm" variant="ghost" className="flex-row gap-1.5">
                <Icon as={Plus} className="size-4" />
                <Text>Add</Text>
              </Button>
            </Link>
          ),
        }}
      />

      <FormScreen>
        {isLoading && expenses.length === 0 ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : expenses.length === 0 ? (
          <EmptyState message="No costs yet. Record what you spend on repairs, parts, and contractors to see it add up here." />
        ) : (
          <>
            <Card className="pb-4">
              <CardHeader className="gap-1">
                <CardDescription>Total recorded</CardDescription>
                <CardTitle className="text-2xl">{formatCents(total)}</CardTitle>
                <CardDescription>
                  {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="pb-4">
              <CardHeader>
                <CardTitle>All costs</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                {expenses.map((expense, index) => {
                  const asset = expense.asset;
                  const assetLabel = asset
                    ? asset.asset_type === 'vehicle'
                      ? `${asset.year ?? ''} ${asset.make ?? ''} ${asset.model ?? ''}`.trim()
                      : `${asset.name ?? ''} · ${asset.category?.name ?? 'Uncategorized'}`
                    : null;

                  return (
                    <View key={expense.id} className="gap-2">
                      {index > 0 ? <Separator /> : null}
                      <View className="flex-row items-start justify-between gap-2 pt-1">
                        <View className="flex-1 gap-0.5">
                          <Text className="text-base font-medium">
                            {formatCents(expense.amount_cents)}
                          </Text>
                          {expense.description ? (
                            <Text className="text-sm text-muted-foreground">
                              {expense.description}
                            </Text>
                          ) : null}
                          <Text className="text-xs text-muted-foreground">
                            {new Date(expense.incurred_at).toLocaleDateString()}
                            {expense.vendor ? ` · ${expense.vendor}` : ''}
                            {assetLabel ? ` · ${assetLabel}` : ''}
                          </Text>
                        </View>
                        <Badge variant="outline">
                          <Text>{expenseCategoryLabel(expense.category)}</Text>
                        </Badge>
                      </View>
                    </View>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </FormScreen>
    </>
  );
}
