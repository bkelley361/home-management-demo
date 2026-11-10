import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { isDemoMode, supabase } from '@/lib/supabase';
import * as React from 'react';
import { View } from 'react-native';

type EnterEmailFormProps = {
  onCodeSent: (email: string) => void;
};

export function EnterEmailForm({ onCodeSent }: EnterEmailFormProps) {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      onCodeSent(trimmedEmail);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onContinueAsDemo() {
    setIsSubmitting(true);
    setError(null);
    try {
      await supabase.auth.signInWithOtp({ email: 'alex.demo@example.com' });
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Could not launch demo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
      <CardHeader className="gap-2 p-0 pb-6">
        <CardTitle className="text-center text-2xl font-bold tracking-tight">Sign In</CardTitle>

        <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground">
          Enter your email to receive a secure one-time verification code.
        </CardDescription>
      </CardHeader>

      <CardContent className="gap-4 p-0">
        <View>
          <Input
            id="email"
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            value={email}
            onChangeText={setEmail}
            editable={!isSubmitting}
            onSubmitEditing={onSubmit}
          />
          <FormError message={error} className="mt-2" />
        </View>

        <View className="gap-3 pt-2">
          <Button onPress={onSubmit} disabled={isSubmitting}>
            <Text>{isSubmitting ? 'Sending…' : 'Continue'}</Text>
          </Button>

          {isDemoMode && (
            <Button variant="outline" onPress={onContinueAsDemo} disabled={isSubmitting}>
              <Text>Explore Demo Mode</Text>
            </Button>
          )}
        </View>
      </CardContent>
    </Card>
  );
}
