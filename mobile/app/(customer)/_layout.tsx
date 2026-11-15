import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { LoadingView, ThemeToggleButton } from '@/components';
import { useAuth } from '@/features/auth';

export default function CustomerTabsLayout() {
  const theme = useAppTheme();
  const { role, loading } = useAuth();

  if (loading) return <LoadingView />;

  // Guests and customers use these tabs; owners and admins are sent back to their own home.
  if (role === 'owner') return <Redirect href="/(owner)/dashboard" />;
  if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerRight: () => <ThemeToggleButton />,
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
