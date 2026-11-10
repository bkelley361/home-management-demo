import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

type FormErrorProps = {
  message: string | null;
  className?: string;
};

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return <Text className={cn('text-sm text-destructive', className)}>{message}</Text>;
}
