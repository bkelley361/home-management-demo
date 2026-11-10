import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

type SepticPumpStepProps = {
  value: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
};

export function SepticPumpStep({ value, onChange, onNext }: SepticPumpStepProps) {
  const [error, setError] = React.useState<string | null>(null);

  function handleNext() {
    if (!value) {
      setError('Please select the last date your septic tank was pumped.');
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight sm:text-left">
          When was your septic tank last pumped?
        </CardTitle>
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
          We'll set a reminder for the recommended next pumping, typically every 3 years.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <Calendar
          mode="single"
          date={value ?? undefined}
          onChange={({ date }) => {
            if (date) onChange(String(date));
          }}
        />

        <FormError message={error} />

        <View className="mt-3 gap-3">
          <Button onPress={handleNext} disabled={!value}>
            <Text>Continue</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
