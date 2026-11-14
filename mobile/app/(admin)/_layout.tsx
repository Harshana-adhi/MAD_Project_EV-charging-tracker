import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminTabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="stations"
        options={{ title: 'Stations', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="ev-station" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="credit-card" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="users"
        options={{ title: 'Users', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
