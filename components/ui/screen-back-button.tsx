import { router, useNavigation } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { cn } from '@/lib/utils';

type Props = {
  /** Route to fall back to when router.canGoBack() is false (e.g. cross-tab navigation or deep links). */
  fallbackHref?: string;
  className?: string;
  onPress?: () => void;
};

export function ScreenBackButton({ fallbackHref = '/assets', className, onPress }: Props) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // If fallbackHref is '/' (opened cross-tab from dashboard):
    // 1. Reset the current tab's stack so that it returns to its root screen ('index' / assets page),
    //    leaving no stale detail screen in memory when the user later clicks the tab.
    // 2. Return to the parent tab navigator (Dashboard).
    if (fallbackHref === '/') {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'index' }] as any,
        });
      } catch {
        // Fall through if reset is not supported
      }

      const parent = navigation.getParent();
      if (parent?.canGoBack()) {
        parent.goBack();
      } else {
        router.replace('/');
      }
      return;
    }

    try {
      const state = navigation.getState();
      if (state?.routes && state.index > 0) {
        const currentRoute = state.routes[state.index];
        const prevRoute = state.routes[state.index - 1];

        const isCurrentCategory =
          currentRoute?.name === 'categories/[id]' || currentRoute?.name === 'uncategorized';
        const isPrevCategory =
          prevRoute?.name === 'categories/[id]' || prevRoute?.name === 'uncategorized';

        // A category detail screen should never go back to another category detail screen.
        // If a category was stacked on top of another category (e.g. cross-tab navigation from dashboard),
        // reset this stack to 'index' and navigate back to the parent navigator (Dashboard).
        if (isCurrentCategory && isPrevCategory) {
          try {
            navigation.reset({
              index: 0,
              routes: [{ name: 'index' }] as any,
            });
          } catch {}

          const parent = navigation.getParent();
          if (parent?.canGoBack()) {
            parent.goBack();
            return;
          } else {
            router.replace((fallbackHref || '/') as any);
            return;
          }
        }
      }
    } catch {
      // Fall through to standard navigation
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref as any);
    }
  };

  return (
    <PressableScale
      activeScale={0.92}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back"
      className={cn(
        'size-9 items-center justify-center rounded-full bg-muted/80 active:bg-muted dark:bg-[#1E2026] dark:active:bg-[#282B33]',
        className
      )}
      onPress={handlePress}>
      <Icon as={ChevronLeft} size={20} className="text-foreground" />
    </PressableScale>
  );
}
