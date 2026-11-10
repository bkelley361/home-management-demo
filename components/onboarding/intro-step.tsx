import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';

type IntroStepProps = {
  onNext: () => void;
};

export function IntroStep({ onNext }: IntroStepProps) {
  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight sm:text-left">
          Let's add your home!
        </CardTitle>
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
          A few quick questions to get everything set up.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <View className="gap-3">
          <Button onPress={onNext}>
            <Text>Continue</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
