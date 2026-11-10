import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';
import { FadeIn } from 'react-native-reanimated';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex h-12 flex-row items-center justify-center rounded-full border border-black/[0.04] bg-muted p-1.5 dark:border-white/10 dark:bg-[#1E2026]',
        Platform.select({ web: 'inline-flex w-fit', native: 'w-full' }),
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-muted-foreground text-sm font-semibold',
        value === props.value && 'text-foreground'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex h-full min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-transparent px-4 py-2 shadow-none transition-all',
          Platform.select({
            web: 'inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          props.value === value &&
            'bg-card text-foreground shadow-sm shadow-black/5 dark:bg-card dark:text-foreground',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}>
      <NativeOnlyAnimatedView entering={FadeIn.duration(180)}>
        {children as React.ReactNode}
      </NativeOnlyAnimatedView>
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
