import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from '@/components/ui/keyboard-aware-scroll-view';

/** Breathing room below the last element, on top of the device inset. */
const BASE_BOTTOM_PADDING = 20;

type FormScreenProps = {
  children: React.ReactNode;
  /**
   * Pinned below the scroll area — put the screen's primary action here so it
   * stays reachable on a long form instead of being scrolled off the bottom.
   */
  footer?: React.ReactNode;
  /** Extra classes on the scroll content container. */
  contentClassName?: string;
  scrollViewProps?: Partial<KeyboardAwareScrollViewProps>;
};

/**
 * Standard layout for a full-screen form or detail view.
 *
 * These screens hide the floating bottom nav (see app/(tabs)/_layout.tsx), so
 * their content runs all the way to the physical edge of the display. Padding
 * therefore has to come from the safe-area inset — a fixed `p-5` leaves the last
 * control under the iOS home indicator or the Android gesture bar, which is
 * exactly the "bottom buttons are unreachable" bug.
 *
 * `useSafeAreaInsets` needs no extra provider here: expo-router already mounts
 * SafeAreaProvider at the root.
 */
export function FormScreen({
  children,
  footer,
  contentClassName,
  scrollViewProps,
}: FormScreenProps) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = React.useState(0);

  // With a footer the inset is consumed by the footer instead, so the scroll
  // content only needs its own base padding above it.
  const scrollBottomPadding = footer ? BASE_BOTTOM_PADDING : BASE_BOTTOM_PADDING + insets.bottom;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KeyboardAwareScrollView
        className="flex-1"
        contentClassName={cn('gap-3 px-5 pt-5', contentClassName)}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        extraBottomOffset={footerHeight}
        {...scrollViewProps}>
        {children}
      </KeyboardAwareScrollView>

      {footer ? (
        <View
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          className="gap-3 border-t border-border bg-background px-5 pt-4"
          style={{ paddingBottom: BASE_BOTTOM_PADDING + insets.bottom }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
