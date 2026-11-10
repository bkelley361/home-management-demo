import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { Text } from '@/components/ui/text';
import { FadeIn } from 'react-native-reanimated';

type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.duration(200)}>
      <Text className="mt-8 text-center text-muted-foreground">{message}</Text>
    </NativeOnlyAnimatedView>
  );
}
