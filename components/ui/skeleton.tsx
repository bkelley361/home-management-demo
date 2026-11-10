import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return (
    <View
      className={cn('animate-pulse rounded-2xl bg-muted dark:bg-[#1E2026]', className)}
      {...props}
    />
  );
}

export { Skeleton };
