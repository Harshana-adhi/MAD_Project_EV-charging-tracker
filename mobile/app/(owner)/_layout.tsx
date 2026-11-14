import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OwnerTabsLayout() {
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
        name="earnings"
        options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
