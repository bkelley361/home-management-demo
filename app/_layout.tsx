import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PortalHost } from '@rn-primitives/portal';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { ThemeProvider } from 'expo-router/react-navigation';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
import { Stack, ErrorBoundary as ExpoErrorBoundary } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Image, View } from 'react-native';

import { ThemeTransition } from '@/components/ui/theme-transition';
import { configureNotificationHandler, ensureNotificationChannel } from '@/lib/notifications';
import { useCurrentHome } from '@/lib/use-current-home';

// Prevent the native splash screen from auto-hiding while initial auth & state resolves.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Must run before any notification is scheduled or received.
configureNotificationHandler();

function SplashScreenView() {
  return (
    <View className="flex-1 items-center justify-center bg-[#121316]">
      <StatusBar style="light" />
      <Image
        source={require('@/assets/images/splash.png')}
        style={{ width: 100, height: 100 }}
        resizeMode="contain"
      />
    </View>
  );
}

function RootNavigation() {
  const { colorScheme } = useColorScheme();
  const { isLoading: isAuthLoading, user } = useAuth();
  const { home, isLoading: isHomesLoading } = useCurrentHome();

  const isStateReady = !isAuthLoading && (!user || !isHomesLoading);
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    ensureNotificationChannel();
    const timer = setTimeout(() => setTimedOut(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  const isAppReady = isStateReady || timedOut;

  React.useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // Keep the splash screen visual up until initial auth resolves
  if (!isAppReady) {
    return <SplashScreenView />;
  }

  const hasHome = !!home;

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <ThemeTransition>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 220,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}>
          <Stack.Protected guard={!!user && hasHome}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>

          <Stack.Protected guard={!!user && !hasHome}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>

          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </ThemeTransition>

      <PortalHost />
    </ThemeProvider>
  );
}

export const ErrorBoundary = ExpoErrorBoundary;

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
