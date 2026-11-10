import * as React from 'react';
import { View } from 'react-native';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeTransition } from '@/components/ui/theme-transition';

type ThemeToggleProps = {
  label?: string;
};

export default function ThemeToggle({ label }: ThemeToggleProps) {
  const { colorScheme } = useColorScheme();
  const { toggleTheme } = useThemeTransition();
  const viewRef = React.useRef<View>(null);

  const ThemeIcon = colorScheme === 'dark' ? MoonStarIcon : SunIcon;

  const handlePress = () => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      toggleTheme({ x: x + width / 2, y: y + height / 2 });
    });
  };

  return (
    <View ref={viewRef} collapsable={false}>
      <Button
        onPress={handlePress}
        size={label ? 'default' : 'icon'}
        variant={label ? 'outline' : 'ghost'}
        className={
          label
            ? 'flex-row items-center gap-2'
            : 'rounded-full border border-border bg-card shadow-sm'
        }>
        <Icon as={ThemeIcon} className="size-5" />
        {label ? <Text>{label}</Text> : null}
      </Button>
    </View>
  );
}
