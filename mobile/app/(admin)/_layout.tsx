import { Redirect, Tabs, router } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme, spacing } from '@/lib/theme';
import { LoadingView, LogoMark } from '@/components';
import { useAuth } from '@/features/auth';
import { NotificationHeaderActions } from '@/features/notifications';

function BackToDashboard() {
  return (
    <IconButton
      icon="arrow-left"
      accessibilityLabel="Back to dashboard"
      onPress={() => router.navigate('/(admin)/dashboard')}
    />
  );
}

// Stations, payments and users are opened from the dashboard cards, so they are hidden from the tab bar.
const dashboardPageOptions = {
  tabBarItemStyle: { display: 'none' as const },
  headerLeft: () => <BackToDashboard />,
};

export default function AdminTabsLayout() {
  const theme = useAppTheme();
  const { role, loading } = useAuth();

  if (loading) return <LoadingView />;
  if (role !== 'admin') return <Redirect href="/" />;

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerLeft: () => <LogoMark size={26} style={{ marginLeft: spacing.md }} />,
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
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" color={color as string} size={size} />
          ),
        }}
      />
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="stations" options={{ title: 'Stations', ...dashboardPageOptions }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', ...dashboardPageOptions }} />
      <Tabs.Screen name="users" options={{ title: 'Users', ...dashboardPageOptions }} />
    </Tabs>
  );
}
