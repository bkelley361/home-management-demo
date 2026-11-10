import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type BottomNavBarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

type BottomNavBarProps = {
  items: BottomNavBarItem[];
  activeKey: string;
  onChange: (key: string) => void;
  visible?: boolean;
  className?: string;
};

export function BottomNavBar({
  items,
  activeKey,
  onChange,
  visible = true,
  className,
}: BottomNavBarProps) {
  const [width, setWidth] = React.useState(0);

  const pillX = useSharedValue(0);
  const isFirstMeasurement = React.useRef(true);

  const translateY = useSharedValue(visible ? 0 : 36);
  const opacity = useSharedValue(visible ? 1 : 0);

  const horizontalPadding = 8; // px-2 = 8px
  const verticalPadding = 6;

  const itemWidth = width > 0 ? (width - horizontalPadding * 2) / items.length : 0;

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 36, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 200,
    });
  }, [visible]);

  React.useEffect(() => {
    if (!itemWidth) return;

    const index = items.findIndex((i) => i.key === activeKey);
    const targetX = (index >= 0 ? index : 0) * itemWidth;

    if (isFirstMeasurement.current) {
      pillX.value = targetX;
      isFirstMeasurement.current = false;
    } else {
      pillX.value = withSpring(targetX, {
        damping: 20,
        stiffness: 280,
        mass: 0.8,
      });
    }
  }, [activeKey, itemWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: pillX.value,
      },
    ],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: translateY.value,
      },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        containerAnimatedStyle,
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 24,
          alignItems: 'center',
        },
      ]}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        className={cn(
          'w-full max-w-md flex-row items-center rounded-full border border-black/[0.04] bg-card/95 px-2 py-1.5 shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#1A1D23]/95',
          className
        )}>
        {itemWidth > 0 && (
          <Animated.View
            style={[
              pillStyle,
              {
                position: 'absolute',
                left: horizontalPadding,
                top: verticalPadding,
                width: itemWidth,
                height: 52,
              },
            ]}
            className="rounded-full bg-accent shadow-sm"
          />
        )}

        {items.map((item) => {
          const isActive = item.key === activeKey;

          return (
            <PressableScale
              key={item.key}
              activeScale={0.92}
              onPress={() => onChange(item.key)}
              hitSlop={8}
              className={cn(
                'h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2',
                Platform.select({
                  web: 'transition-opacity active:opacity-80',
                })
              )}>
              <TextClassContext.Provider
                value={isActive ? 'text-accent-foreground' : 'text-muted-foreground'}>
                <Icon as={item.icon} size={20} strokeWidth={isActive ? 2.5 : 2} />
                <Text
                  className={cn(
                    'text-[10px] leading-none tracking-tight',
                    isActive
                      ? 'font-bold text-accent-foreground'
                      : 'font-medium text-muted-foreground'
                  )}>
                  {item.label}
                </Text>
              </TextClassContext.Provider>
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

export type { BottomNavBarItem };
