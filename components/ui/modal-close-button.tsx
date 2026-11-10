import { router } from 'expo-router';
import { X } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';

export function ModalCloseButton() {
  return (
    <PressableScale
      activeScale={0.92}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close"
      className="size-9 items-center justify-center rounded-full bg-muted/80 active:bg-muted dark:bg-[#1E2026] dark:active:bg-[#282B33]"
      onPress={() => router.back()}>
      <Icon as={X} size={18} className="text-foreground" />
    </PressableScale>
  );
}
