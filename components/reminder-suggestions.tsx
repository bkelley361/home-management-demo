import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import {
  buildAutoReminderPayload,
  formatRecurrenceRule,
  type ReminderSuggestion,
} from '@/lib/reminders';

type Props = {
  suggestions: ReminderSuggestion[];
  homeId: string;
  /** Link applied to every accepted reminder, e.g. `{ asset: id }`. */
  link?: Partial<Record<'asset' | 'utility_provider' | 'part', string>>;
  /** `auto_key` values already accepted — these are filtered out. */
  existingKeys?: string[];
  title?: string;
  description?: string;
  onDone?: () => void;
};

/**
 * Reviewable accept/dismiss checklist for auto-suggested reminders.
 *
 * Suggestions whose `key` already appears in `existingKeys` are hidden, so
 * revisiting this screen never offers a duplicate.
 */
export function ReminderSuggestions({
  suggestions,
  homeId,
  link,
  existingKeys = [],
  title = 'Suggested reminders',
  description = 'Recommended upkeep based on your home’s setup. Uncheck anything you don’t want.',
  onDone,
}: Props) {
  const available = React.useMemo(
    () => suggestions.filter((s) => !existingKeys.includes(s.key)),
    [suggestions, existingKeys]
  );

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Seed defaults once the suggestion list is known.
  React.useEffect(() => {
    setSelected(Object.fromEntries(available.map((s) => [s.key, s.recommended])));
  }, [available]);

  const selectedCount = available.filter((s) => selected[s.key]).length;

  async function handleAdd() {
    const chosen = available.filter((s) => selected[s.key]);
    if (chosen.length === 0) {
      onDone?.();
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.rpc('accept_auto_reminders', {
        p_home_id: homeId,
        p_reminders: chosen.map((suggestion) => buildAutoReminderPayload(suggestion, link)),
      });
      if (error) throw error;
      setSavedCount(chosen.length);
      onDone?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add reminders.');
    } finally {
      setIsSaving(false);
    }
  }

  if (available.length === 0) return null;

  if (savedCount !== null) {
    return (
      <Animated.View entering={FadeIn.duration(220)}>
        <Card className="rounded-[32px] border-black/[0.04] dark:border-white/10">
          <CardHeader>
            <View className="flex-row items-center gap-2">
              <View className="size-8 items-center justify-center rounded-full bg-secondary">
                <Icon as={Sparkles} className="size-4 text-secondary-foreground" />
              </View>
              <CardTitle>Reminders added</CardTitle>
            </View>
            <CardDescription>
              {savedCount} reminder{savedCount === 1 ? '' : 's'} added to your schedule.
            </CardDescription>
          </CardHeader>
        </Card>
      </Animated.View>
    );
  }

  return (
    <Card className="rounded-[32px] border-0 bg-[#EFF0A3] shadow-sm dark:border dark:border-[#EFF0A3]/20 dark:bg-[#1F2017]">
      <CardHeader className="gap-1.5 pb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="size-8 items-center justify-center rounded-full bg-black/10 dark:bg-[#EFF0A3]/20">
              <Icon as={Sparkles} className="size-4 text-[#1C1D00] dark:text-[#EFF0A3]" />
            </View>
            <Text className="text-xs font-bold uppercase tracking-wider text-[#1C1D00]/70 dark:text-[#EFF0A3]/70">
              AI Upkeep Assistant
            </Text>
          </View>
          <Badge
            variant="default"
            className="bg-[#1C1D00] text-white dark:bg-[#EFF0A3] dark:text-[#1C1D00]">
            <Text>{available.length} Available</Text>
          </Badge>
        </View>
        <CardTitle className="text-xl font-bold text-[#1C1D00] dark:text-[#EFF0A3]">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-[#1C1D00]/80 dark:text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-2.5 pt-2">
        {available.map((suggestion, index) => {
          const checked = !!selected[suggestion.key];
          return (
            <Animated.View
              key={suggestion.key}
              layout={LinearTransition.duration(200)}
              entering={FadeInDown.delay(index * 25).duration(180)}>
              <PressableScale
                activeScale={0.98}
                className="flex-row items-start gap-3 rounded-[20px] bg-white/70 p-3.5 dark:bg-[#161712]"
                onPress={() => setSelected((prev) => ({ ...prev, [suggestion.key]: !checked }))}>
                <View className="pt-0.5">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      setSelected((prev) => ({ ...prev, [suggestion.key]: next }))
                    }
                  />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-foreground">
                    {suggestion.title}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatRecurrenceRule(suggestion.recurrenceRule)}
                    {suggestion.dueMileage
                      ? ` · first at ${suggestion.dueMileage.toLocaleString()} mi`
                      : ` · first on ${new Date(suggestion.dueDate).toLocaleDateString()}`}
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}

        {errorMessage ? <Text className="text-sm text-destructive">{errorMessage}</Text> : null}

        <View className="pt-2">
          <Button
            onPress={handleAdd}
            disabled={isSaving}
            variant="default"
            className="w-full bg-[#1C1D00] text-white dark:bg-[#EFF0A3] dark:text-[#1C1D00]">
            <Text>
              {isSaving
                ? 'Adding…'
                : selectedCount === 0
                  ? 'Skip Suggestions'
                  : `Add ${selectedCount} Reminder${selectedCount === 1 ? '' : 's'}`}
            </Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
