import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

type SprinklersStepProps = {
  value: boolean | null;
  onChange: (value: boolean) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
};

export function SprinklersStep({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  error,
}: SprinklersStepProps) {
  const radioValue = value === null ? undefined : value ? 'yes' : 'no';

  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight sm:text-left">
          Do you have sprinklers?
        </CardTitle>
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
          Last question — we'll use this to suggest seasonal reminders.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <RadioGroup value={radioValue} onValueChange={(v) => onChange(v === 'yes')}>
          <RadioOption
            value="yes"
            label="Yes"
            nativeID="sprinklers-yes"
            onSelect={() => onChange(true)}
          />
          <RadioOption
            value="no"
            label="No"
            nativeID="sprinklers-no"
            onSelect={() => onChange(false)}
          />
        </RadioGroup>

        <FormError message={error} />

        <View className="gap-3">
          <Button onPress={onSubmit} disabled={value === null || isSubmitting}>
            <Text>{isSubmitting ? 'Finishing up…' : 'Finish'}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
