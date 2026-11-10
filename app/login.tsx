import * as React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnterEmailForm } from '@/components/enter-email-form';
import { VerifyEmailForm } from '@/components/verify-email-form';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';

export default function LoginScreen() {
  const [email, setEmail] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <KeyboardAwareScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24) + 16,
        }}
        contentClassName="px-4">
        <View className="my-auto w-full max-w-sm self-center">
          {email === null ? (
            <EnterEmailForm onCodeSent={setEmail} />
          ) : (
            <VerifyEmailForm email={email} onCancel={() => setEmail(null)} />
          )}
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}
