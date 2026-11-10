import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { cn } from '@/lib/utils';
import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { Check } from 'lucide-react-native';
import { Platform } from 'react-native';
import { ZoomIn } from 'react-native-reanimated';

const DEFAULT_HIT_SLOP = 24;

function Checkbox({
  className,
  checkedClassName,
  indicatorClassName,
  iconClassName,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  checkedClassName?: string;
  indicatorClassName?: string;
  iconClassName?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'size-5 shrink-0 rounded-lg border border-black/15 shadow-sm shadow-black/5 dark:border-white/20 dark:bg-[#1E2026]',
        Platform.select({
          web: 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive peer cursor-default outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed',
          native: 'overflow-hidden',
        }),
        props.checked &&
          cn('border-primary bg-primary dark:border-accent dark:bg-accent', checkedClassName),
        props.disabled && 'opacity-50',
        className
      )}
      hitSlop={DEFAULT_HIT_SLOP}
      {...props}>
      <CheckboxPrimitive.Indicator
        className={cn(
          'h-full w-full items-center justify-center bg-primary dark:bg-accent',
          indicatorClassName
        )}>
        <NativeOnlyAnimatedView entering={ZoomIn.duration(150).springify().damping(14)}>
          <Icon
            as={Check}
            size={14}
            strokeWidth={Platform.OS === 'web' ? 2.5 : 3.5}
            className={cn('text-primary-foreground dark:text-accent-foreground', iconClassName)}
          />
        </NativeOnlyAnimatedView>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
