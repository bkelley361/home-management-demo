import { Link } from 'expo-router';
import { ExternalLink, Search, Trash2 } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { formatRecurrenceRule } from '@/lib/reminders';

export type AssetPart = {
  id: string;
  part_name: string;
  part_number?: string | null;
  brand?: string | null;
  notes?: string | null;
  source_link?: string | null;
  last_replaced_date?: number | null;
  replacement_rule?: string | null;
};

type Props = {
  assetType: 'vehicle' | 'general';
  assetId: string;
  homeId: string;
  parts: AssetPart[];
  categoryName: string;
};

/**
 * Parts for one asset, plus the entry point into the AI lookup.
 *
 * Replaces the old home-wide parts list: parts are only meaningful in the
 * context of the thing they belong to.
 */
export function AssetPartsCard({ assetType, assetId, homeId, parts, categoryName }: Props) {
  async function removePart(partId: string) {
    const { error } = await supabase.from('parts').delete().eq('id', partId).eq('home_id', homeId);
    if (error) throw error;
  }

  return (
    <Card className="pb-4">
      <CardHeader className="gap-2">
        <CardTitle>Parts</CardTitle>
        <CardDescription>
          Look up what fits this {assetType === 'vehicle' ? 'vehicle' : categoryName} — oil,
          filters, and wear parts.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-3">
        <Link href={`/assets/parts-lookup?assetId=${assetId}`} asChild>
          <Button className="flex-row gap-2">
            <Icon as={Search} className="size-4" />
            <Text>Find parts</Text>
          </Button>
        </Link>

        {parts.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            No parts saved yet. Tap Find parts to look one up.
          </Text>
        ) : (
          <View className="gap-3">
            {parts.map((part, index) => (
              <Animated.View
                key={part.id}
                layout={LinearTransition.duration(220)}
                entering={FadeInDown.duration(200)}
                exiting={FadeOutRight.duration(180)}
                className="gap-2">
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
                    {part.last_replaced_date ? (
                      <Text className="text-xs text-muted-foreground">
                        Last replaced {new Date(part.last_replaced_date).toLocaleDateString()}
                      </Text>
                    ) : null}
                    {part.replacement_rule && part.replacement_rule !== 'none' ? (
                      <Text className="text-xs text-muted-foreground">
                        Replace {formatRecurrenceRule(part.replacement_rule).toLowerCase()}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row gap-1">
                    {part.source_link ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onPress={() => Linking.openURL(part.source_link!)}>
                        <Icon as={ExternalLink} className="size-4" />
                      </Button>
                    ) : null}
                    <Button size="icon" variant="ghost" onPress={() => removePart(part.id)}>
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
