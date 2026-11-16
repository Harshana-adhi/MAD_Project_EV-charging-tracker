import { Redirect, Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { LoadingView, LogoMark } from '@/components';
import { useAuth } from '@/features/auth';
import { NotificationHeaderActions } from '@/features/notifications';
import { AdminMenuButton } from '@/features/admin/components/AdminMenu';

// Goes back to wherever the admin came from (the dashboard, the profile, the menu...). Only when
// there is nothing to go back to, e.g. the page was opened directly, does it fall back to the dashboard.
function BackButton() {
  return (
    <IconButton
      icon="arrow-left"
      accessibilityLabel="Back"
      onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(admin)/dashboard'))}
    />
  );
}

// Stations, payments and users are opened from the dashboard cards, the menu or the profile, so they are
// hidden from the tab bar.
const dashboardPageOptions = {
  tabBarItemStyle: { display: 'none' as const },
  headerLeft: () => <BackButton />,
};

export default function AdminTabsLayout() {
  const theme = useAppTheme();
  const { role, loading } = useAuth();

  if (loading) return <LoadingView />;
  if (role !== 'admin') return <Redirect href="/" />;

  return (
    <Tabs
      // Back returns to the previous screen, not always to the dashboard.
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AdminMenuButton />
            <LogoMark size={26} />
          </View>
        ),
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
