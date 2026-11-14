import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CustomerTabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="sessions"
        options={{ title: 'Sessions', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="ev-station" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: 'Wallet', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wallet" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
