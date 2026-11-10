import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export type WaterSource = 'city' | 'well';

type WaterStepProps = {
  value: WaterSource | null;
  onChange: (value: WaterSource) => void;
  onNext: () => void;
};

export function WaterStep({ value, onChange, onNext }: WaterStepProps) {
  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight sm:text-left">
          What's your water source?
        </CardTitle>
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
          You can change this later if it changes.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <RadioGroup value={value ?? undefined} onValueChange={(v) => onChange(v as WaterSource)}>
          <RadioOption
            value="city"
            label="City water"
            nativeID="water-source-city"
            onSelect={() => onChange('city')}
          />
          <RadioOption
            value="well"
            label="Well"
            nativeID="water-source-well"
            onSelect={() => onChange('well')}
          />
        </RadioGroup>

        <View className="gap-3">
          <Button onPress={onNext} disabled={!value}>
            <Text>Continue</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
