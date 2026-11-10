import { Tabs, usePathname } from 'expo-router';
import { Bell, Home, Package, Settings } from 'lucide-react-native';
import { View } from 'react-native';

import { BottomNavBar } from '@/components/ui/bottom-nav-bar';

const NAV_ITEMS = [
  { key: 'index', label: 'Home', icon: Home },
  { key: 'assets', label: 'Assets', icon: Package },
  { key: 'reminders', label: 'Reminders', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
];

/** Routes that take over the whole screen and should hide the floating nav. */
const FULL_SCREEN_SEGMENTS = ['/add', '/edit', '/new', '/parts-lookup', '/expenses', '/categories'];

/**
 * Detail routes: /reminders/<id>, /assets/<id>, /assets/categories/<id>.
 * Deeper category routes are forms and hide the nav through FULL_SCREEN_SEGMENTS.
 */
const DETAIL_ROUTE = /^\/(?:reminders\/[^/]+|assets\/(?:[^/]+|categories\/[^/]+))$/;

function isFullScreen(pathname: string) {
  if (FULL_SCREEN_SEGMENTS.some((segment) => pathname.includes(segment))) return true;
  return DETAIL_ROUTE.test(pathname);
}

export default function TabsLayout() {
  const pathname = usePathname();
  const hideTabBar = isFullScreen(pathname);

  return (
    <View className="flex-1">
      <Tabs
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
        }}
        tabBar={({ state, navigation }) => {
          const currentTab = state.routes[state.index].name;
          return (
            <BottomNavBar
              items={NAV_ITEMS}
              activeKey={currentTab}
              onChange={(key) => {
                navigation.navigate(key, { screen: 'index' });
              }}
              visible={!hideTabBar}
            />
          );
        }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="assets" />
        <Tabs.Screen name="reminders" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </View>
  );
}
