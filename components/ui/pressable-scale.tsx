import * as React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = PressableProps & {
  activeScale?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
};

export const PressableScale = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  PressableScaleProps
>(
  (
    { activeScale = 0.98, disabled, onPressIn, onPressOut, style, className, children, ...props },
    ref
  ) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = React.useCallback(
      (e: any) => {
        if (!disabled) {
          scale.value = withSpring(activeScale, {
            damping: 16,
            stiffness: 400,
          });
        }
        onPressIn?.(e);
      },
      [activeScale, disabled, onPressIn, scale]
    );

    const handlePressOut = React.useCallback(
      (e: any) => {
        if (!disabled) {
          scale.value = withSpring(1, {
            damping: 12,
            stiffness: 400,
          });
        }
        onPressOut?.(e);
      },
      [disabled, onPressOut, scale]
    );

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        unstable_pressDelay={0}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, style as any]}
        className={className}
        {...props}>
        {children}
      </AnimatedPressable>
    );
  }
);

PressableScale.displayName = 'PressableScale';
