import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import DateTimePicker, { useDefaultClassNames } from 'react-native-ui-datepicker';

type CalendarProps = React.ComponentProps<typeof DateTimePicker> & {
  className?: string;
};

function Calendar({ className, classNames, components, ...props }: CalendarProps) {
  const defaultClassNames = useDefaultClassNames();

  return (
    <DateTimePicker
      className={cn(
        'rounded-[28px] border border-black/[0.04] bg-card p-4 shadow-sm dark:border-white/10',
        className
      )}
      classNames={{
        ...defaultClassNames,
        header: cn(defaultClassNames.header, 'mb-2'),
        month_selector_label: cn(defaultClassNames.month_selector_label, 'text-base font-semibold'),
        year_selector_label: cn(defaultClassNames.year_selector_label, 'text-base font-semibold'),
        weekday_label: cn(defaultClassNames.weekday_label, 'font-medium text-muted-foreground'),
        day_label: cn(defaultClassNames.day_label, 'text-sm font-medium'),
        today: cn(defaultClassNames.today, 'border border-primary/40 bg-transparent rounded-full'),
        today_label: cn(defaultClassNames.today_label, 'text-primary font-bold'),
        selected: cn(defaultClassNames.selected, 'rounded-full bg-primary'),
        selected_label: cn(
          defaultClassNames.selected_label,
          'font-semibold text-primary-foreground'
        ),
        range_middle: cn(defaultClassNames.range_middle, 'bg-accent'),
        range_middle_label: cn(defaultClassNames.range_middle_label, 'font-normal'),
        disabled_label: cn(defaultClassNames.disabled_label, 'opacity-30'),
        time_selector_label: cn(defaultClassNames.time_selector_label, 'text-base'),
        time_label: cn(defaultClassNames.time_label, 'tabular-nums'),
        time_selected_indicator: cn(defaultClassNames.time_selected_indicator, 'rounded-full'),
        ...classNames,
      }}
      components={{
        IconPrev: <Icon as={ChevronLeft} size={16} className="text-foreground" />,
        IconNext: <Icon as={ChevronRight} size={16} className="text-foreground" />,
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
export type { CalendarProps };
