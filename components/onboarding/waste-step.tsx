import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioOption } from '@/components/ui/radio-option';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

export type WasteSystem = 'sewer' | 'septic';

type WasteStepProps = {
  value: WasteSystem | null;
  onChange: (value: WasteSystem) => void;
  onNext: () => void;
};

export function WasteStep({ value, onChange, onNext }: WasteStepProps) {
  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight sm:text-left">
          What's your waste system?
        </CardTitle>
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
          You can change this later if it changes.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <RadioGroup value={value ?? undefined} onValueChange={(v) => onChange(v as WasteSystem)}>
          <RadioOption
            value="sewer"
            label="Sewer"
            nativeID="waste-system-sewer"
            onSelect={() => onChange('sewer')}
          />
          <RadioOption
            value="septic"
            label="Septic"
            nativeID="waste-system-septic"
            onSelect={() => onChange('septic')}
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
