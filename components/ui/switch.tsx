import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@rn-primitives/switch';
import * as React from 'react';
import { Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  const translateX = useSharedValue(props.checked ? 20 : 2);

  React.useEffect(() => {
    translateX.value = withSpring(props.checked ? 20 : 2, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    });
  }, [props.checked]);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-7 w-12 shrink-0 flex-row items-center rounded-full border border-transparent shadow-sm shadow-black/5',
        Platform.select({
          web: 'peer inline-flex outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed',
        }),
        props.checked ? 'bg-[#1B1C1C] dark:bg-accent' : 'bg-[#E5E2E1] dark:bg-[#22262E]',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <SwitchPrimitives.Thumb asChild>
        <Animated.View
          style={Platform.OS !== 'web' ? thumbAnimatedStyle : undefined}
          className={cn(
            'size-6 rounded-full shadow-sm',
            Platform.select({
              web: cn(
                'pointer-events-none block ring-0 transition-transform',
                props.checked ? 'translate-x-5' : 'translate-x-0.5'
              ),
            }),
            props.checked ? 'bg-white dark:bg-accent-foreground' : 'bg-white dark:bg-foreground/80'
          )}
        />
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
}

export { Switch };
