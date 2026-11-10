import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-full shadow-none',
    Platform.select({
      web: "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary shadow-sm shadow-black/10 active:bg-primary/90',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive shadow-sm shadow-black/10 active:bg-destructive/90',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn(
          'border border-black/[0.06] bg-card shadow-sm shadow-black/5 active:bg-muted dark:border-white/10 dark:bg-card',
          Platform.select({
            web: 'hover:bg-muted dark:hover:bg-white/5',
          })
        ),
        secondary: cn(
          'bg-muted shadow-none active:bg-muted/80 dark:border dark:border-white/10 dark:bg-muted',
          Platform.select({ web: 'hover:bg-muted/80' })
        ),
        accent: cn(
          'bg-accent shadow-sm shadow-black/5 active:bg-accent/80',
          Platform.select({ web: 'hover:bg-accent/90' })
        ),
        sage: cn(
          'bg-secondary shadow-none active:bg-secondary/80 dark:bg-[#223325]',
          Platform.select({ web: 'hover:bg-secondary/90' })
        ),
        ghost: cn(
          'active:bg-muted dark:active:bg-muted/50',
          Platform.select({ web: 'hover:bg-muted dark:hover:bg-muted/50' })
        ),
        link: '',
      },
      size: {
        default: cn('h-12 px-6 py-3', Platform.select({ web: 'has-[>svg]:px-4' })),
        sm: cn('h-9 gap-1.5 px-4 py-1.5', Platform.select({ web: 'has-[>svg]:px-3' })),
        lg: cn('h-14 px-8 py-4', Platform.select({ web: 'has-[>svg]:px-6' })),
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-base font-semibold text-foreground',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: cn(
          'text-foreground group-active:text-foreground/80',
          Platform.select({ web: 'group-hover:text-foreground' })
        ),
        secondary: 'text-foreground',
        accent: 'text-accent-foreground',
        sage: 'text-secondary-foreground dark:text-[#CFDECA]',
        ghost: 'text-foreground group-active:text-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: 'text-base font-semibold',
        sm: 'text-sm font-medium',
        lg: 'text-lg font-semibold',
        icon: '',
        'icon-sm': '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  ({ className, variant, size, disabled, onPressIn, onPressOut, style, ...props }, ref) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = React.useCallback(
      (e: any) => {
        if (!disabled) {
          scale.value = withSpring(0.96, {
            damping: 15,
            stiffness: 400,
          });
        }
        onPressIn?.(e);
      },
      [disabled, onPressIn, scale]
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
      <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
        <AnimatedPressable
          ref={ref}
          disabled={disabled}
          unstable_pressDelay={0}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, style as any]}
          className={cn(disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
          role="button"
          {...props}
        />
      </TextClassContext.Provider>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
