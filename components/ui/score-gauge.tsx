import * as React from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreGaugeProps = {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function getScoreColor(score: number) {
  if (score >= 75) {
    return {
      stroke: '#22C55E', // Green
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      badge: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Optimal State',
    };
  }
  if (score >= 50) {
    return {
      stroke: '#EAB308', // Yellow
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      badge: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      dot: 'bg-amber-500',
      label: 'Needs Attention',
    };
  }
  return {
    stroke: '#EF4444', // Red
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    badge: 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Action Required',
  };
}

export function ScoreGauge({ score, size = 72, strokeWidth = 3.5, className }: ScoreGaugeProps) {
  const { colorScheme } = useColorScheme();
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2 - 1;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;
  const colors = getScoreColor(clampedScore);
  const trackStroke = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  const animatedScore = useSharedValue(0);

  React.useEffect(() => {
    animatedScore.value = withTiming(clampedScore, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedScore]);

  const animatedCircleProps = useAnimatedProps(() => {
    const offset = circumference - (animatedScore.value / 100) * circumference;
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View
      style={{ width: size, height: size }}
      className={cn(
        'relative items-center justify-center rounded-full bg-muted/30 dark:bg-white/[0.03]',
        className
      )}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackStroke}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress stroke */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-xl font-extrabold leading-none text-foreground">{clampedScore}</Text>
      </View>
    </View>
  );
}
