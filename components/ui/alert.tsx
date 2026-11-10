import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

function Alert({
  className,
  variant = 'default',
  children,
  icon,
  iconClassName,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    icon: LucideIcon;
    variant?: 'default' | 'destructive' | 'accent' | 'sage';
    iconClassName?: string;
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground',
        variant === 'destructive' && 'text-[#93000A] dark:text-[#FFB4AB]',
        variant === 'accent' && 'text-accent-foreground dark:text-[#EFF0A3]',
        variant === 'sage' && 'text-secondary-foreground dark:text-[#CFDECA]',
        className
      )}>
      <View
        role="alert"
        className={cn(
          'relative w-full flex-row items-start gap-3 rounded-[24px] border border-transparent p-4',
          variant === 'default' && 'bg-muted dark:border-white/10 dark:bg-[#1E2026]',
          variant === 'destructive' && 'bg-[#FFDAD6] dark:border-[#FFB4AB]/20 dark:bg-[#4E161C]',
          variant === 'accent' && 'bg-accent dark:border-[#EFF0A3]/30 dark:bg-[#313217]',
          variant === 'sage' && 'bg-secondary dark:border-[#CFDECA]/20 dark:bg-[#223325]',
          className
        )}
        {...props}>
        <View className="mt-0.5">
          <Icon
            as={icon}
            className={cn(
              'size-5',
              variant === 'destructive' && 'text-[#93000A] dark:text-[#FFB4AB]',
              variant === 'accent' && 'text-accent-foreground dark:text-[#EFF0A3]',
              variant === 'sage' && 'text-secondary-foreground dark:text-[#CFDECA]',
              iconClassName
            )}
          />
        </View>
        <View className="flex-1 gap-1">{children}</View>
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('text-base font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <Text
      className={cn(
        'text-sm leading-relaxed text-muted-foreground',
        textClass?.includes('text-') && textClass,
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
