import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, View } from 'react-native';

const badgeVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 py-1',
    Platform.select({
      web: 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3.5',
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'border-transparent bg-primary',
          Platform.select({ web: '[a&]:hover:bg-primary/90' })
        ),
        secondary: cn(
          'border-transparent bg-secondary dark:bg-[#223325]',
          Platform.select({ web: '[a&]:hover:bg-secondary/90' })
        ),
        accent: cn(
          'border-transparent bg-accent dark:border dark:border-[#EFF0A3]/20 dark:bg-[#313217]',
          Platform.select({ web: '[a&]:hover:bg-accent/90' })
        ),
        alice: cn(
          'border-transparent bg-[#E5ECF6] dark:bg-[#172230]',
          Platform.select({ web: '[a&]:hover:bg-[#E5ECF6]/90' })
        ),
        destructive: cn(
          'border-transparent bg-[#FFDAD6] dark:bg-[#4E161C]',
          Platform.select({ web: '[a&]:hover:bg-[#FFDAD6]/90' })
        ),
        surface: cn(
          'border-transparent bg-muted dark:bg-[#22262E]',
          Platform.select({ web: '[a&]:hover:bg-muted/90' })
        ),
        outline: cn(
          'border border-black/[0.08] bg-transparent dark:border-white/10',
          Platform.select({ web: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground' })
        ),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground dark:text-[#CFDECA]',
      accent: 'text-accent-foreground dark:text-[#EFF0A3]',
      alice: 'text-[#151C23] dark:text-[#D8DFE9]',
      destructive: 'text-[#93000A] dark:text-[#FFB4AB]',
      surface: 'text-foreground dark:text-muted-foreground',
      outline: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
