import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

type AddressStepProps = {
  value: Address;
  onChange: (value: Address) => void;
  onNext: () => void;
};

export function AddressStep({ value, onChange, onNext }: AddressStepProps) {
  const [error, setError] = React.useState<string | null>(null);

  function handleNext() {
    if (!value.street.trim() || !value.city.trim() || !value.state.trim() || !value.zip.trim()) {
      setError('Please fill out every field.');
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight sm:text-left">
          What's the address?
        </CardTitle>
        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
          Enter the address of your home.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <View className="gap-3">
          <View className="gap-1.5">
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              placeholder="123 Main St"
              autoComplete="street-address"
              value={value.street}
              onChangeText={(street) => onChange({ ...value, street })}
            />
          </View>
          <View className="gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Springfield"
              value={value.city}
              onChangeText={(city) => onChange({ ...value, city })}
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="OH"
                autoCapitalize="characters"
                value={value.state}
                onChangeText={(state) => onChange({ ...value, state })}
              />
            </View>
            <View className="flex-1 gap-1.5">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                placeholder="45501"
                keyboardType="number-pad"
                value={value.zip}
                onChangeText={(zip) => onChange({ ...value, zip })}
              />
            </View>
          </View>
          <FormError message={error} />
        </View>

        <View className="mt-3 gap-3">
          <Button onPress={handleNext}>
            <Text>Continue</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
