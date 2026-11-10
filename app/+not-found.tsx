import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-3xl font-bold">This screen doesn't exist.</Text>

        <Link href="/" asChild>
          <Button>
            <Text>Go to home screen</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}
