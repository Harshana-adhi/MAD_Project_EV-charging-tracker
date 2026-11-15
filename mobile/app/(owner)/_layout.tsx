import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { LoadingView } from '@/components';
import { useAuth } from '@/features/auth';
import { NotificationHeaderActions } from '@/features/notifications';

export default function OwnerTabsLayout() {
  const theme = useAppTheme();
  const { role, loading } = useAuth();

  if (loading) return <LoadingView />;
  if (role !== 'owner') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerRight: () => <NotificationHeaderActions />,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stations"
        options={{
          title: 'Stations',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="ev-station" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" color={color as string} size={size} />
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
