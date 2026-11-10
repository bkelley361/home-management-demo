import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { isDemoMode, supabase } from '@/lib/supabase';
import * as React from 'react';
import { type TextStyle, View } from 'react-native';

const RESEND_CODE_INTERVAL_SECONDS = 30;

const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ['tabular-nums'] };

type VerifyEmailFormProps = {
  email: string;
  onCancel: () => void;
};

export function VerifyEmailForm({ email, onCancel }: VerifyEmailFormProps) {
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);
  const [code, setCode] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit() {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter the verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: trimmedCode, type: 'email' });
      if (error) throw error;
      // Root layout redirects to the app once auth state updates.
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResend() {
    restartCountdown();
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to resend the code.');
    }
  }

  return (
    <View className="gap-6">
      <Card className="border border-black/[0.04] p-8 shadow-sm dark:border-white/10">
        <CardHeader className="gap-2 p-0 pb-6">
          <CardTitle className="text-center text-2xl font-bold tracking-tight">
            Verify your email
          </CardTitle>
          <CardDescription className="text-center text-sm leading-relaxed text-muted-foreground">
            Enter the verification code sent to {email}
            {isDemoMode && '\n(Demo Mode: enter any 6 digits e.g. 123456)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6 p-0">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                autoCapitalize="none"
                returnKeyType="send"
                keyboardType="numeric"
                maxLength={8}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 8))}
                editable={!isSubmitting}
                onSubmitEditing={onSubmit}
              />
              <FormError message={error} />
              <Button variant="link" size="sm" disabled={countdown > 0} onPress={onResend}>
                <Text className="text-center text-xs">
                  Didn&apos;t receive the code? Resend{' '}
                  {countdown > 0 ? (
                    <Text className="text-xs" style={TABULAR_NUMBERS_STYLE}>
                      ({countdown})
                    </Text>
                  ) : null}
                </Text>
              </Button>
            </View>
            <View className="gap-3">
              <Button onPress={onSubmit} disabled={isSubmitting}>
                <Text>{isSubmitting ? 'Verifying…' : 'Continue'}</Text>
              </Button>
              <Button variant="link" className="mx-auto" onPress={onCancel}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = React.useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = React.useCallback(() => {
    stopCountdown();
    setCountdown(seconds);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }, [seconds, stopCountdown]);

  React.useEffect(() => {
    startCountdown();

    return stopCountdown;
  }, [startCountdown, stopCountdown]);

  return { countdown, restartCountdown: startCountdown };
}
