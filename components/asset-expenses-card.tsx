import { Link } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { expenseCategoryLabel } from '@/lib/expenses';
import { formatCents, sumCents } from '@/lib/money';
import { useCurrentHome } from '@/lib/use-current-home';

export type AssetExpense = {
  id: string;
  amount_cents: number;
  category: string;
  incurred_at: number;
  description?: string | null;
  vendor?: string | null;
};

type Props = {
  assetType: 'vehicle' | 'general';
  assetId: string;
  expenses: AssetExpense[];
  categoryName: string;
};

/**
 * What this asset has cost so far, plus an entry point to record more.
 *
 * Sibling to AssetPartsCard — same structure so the detail screens read
 * consistently.
 */
export function AssetExpensesCard({ assetType, assetId, expenses, categoryName }: Props) {
  const { homeId } = useCurrentHome();
  async function removeExpense(expenseId: string) {
    if (!homeId) return;
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('home_id', homeId);
    if (error) throw error;
  }

  // Newest first. Sorted here rather than in the query because these arrive as a
  // nested relation, where `order` isn't supported.
  const sorted = [...expenses].sort((a, b) => b.incurred_at - a.incurred_at);
  const total = sumCents(sorted.map((e) => e.amount_cents));

  return (
    <Card className="pb-4">
      <CardHeader className="gap-2">
        <CardTitle>Costs</CardTitle>
        <CardDescription>
          {sorted.length === 0
            ? `Track what this ${assetType === 'vehicle' ? 'vehicle' : categoryName} costs you over time.`
            : `${formatCents(total)} across ${sorted.length} ${
                sorted.length === 1 ? 'entry' : 'entries'
              }.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <Link href={`/assets/expenses/add?assetId=${assetId}`} asChild>
          <Button className="flex-row gap-2">
            <Icon as={Plus} className="size-4" />
            <Text>Add expense</Text>
          </Button>
        </Link>

        {sorted.length === 0 ? (
          <Text className="text-sm text-muted-foreground">No costs recorded yet.</Text>
        ) : (
          <View className="gap-3">
            {sorted.map((expense, index) => (
              <Animated.View
                key={expense.id}
                layout={LinearTransition.duration(220)}
                entering={FadeInDown.duration(200)}
                exiting={FadeOutRight.duration(180)}
                className="gap-2">
                {index > 0 ? <Separator /> : null}
                <View className="flex-row items-start justify-between gap-2 pt-1">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-base font-medium">
                      {formatCents(expense.amount_cents)}
                    </Text>
                    {expense.description ? (
                      <Text className="text-sm text-muted-foreground">{expense.description}</Text>
                    ) : null}
                    <Text className="text-xs text-muted-foreground">
                      {new Date(expense.incurred_at).toLocaleDateString()}
                      {expense.vendor ? ` · ${expense.vendor}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Badge variant="outline">
                      <Text>{expenseCategoryLabel(expense.category)}</Text>
                    </Badge>
                    <Button size="icon" variant="ghost" onPress={() => removeExpense(expense.id)}>
                      <Icon as={Trash2} className="size-4 text-destructive" />
                    </Button>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
