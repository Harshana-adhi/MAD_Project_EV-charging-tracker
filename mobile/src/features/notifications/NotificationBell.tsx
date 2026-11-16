import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, IconButton } from 'react-native-paper';
import { ThemeToggleButton } from '@/components';
import { useAuth } from '@/features/auth';
import { useAppTheme } from '@/lib/theme';
import { useNotifications } from './hooks';
import { RefreshButton } from './RefreshButton';

export function NotificationBell({ contained }: { contained?: boolean }) {
  const { user } = useAuth();
  const theme = useAppTheme();
  const { data } = useNotifications();
  if (!user) return null;

  const unread = data?.filter(({ read }) => !read).length ?? 0;
  return (
    <View>
      <IconButton
        icon={unread > 0 ? 'bell' : 'bell-outline'}
        mode={contained ? 'contained' : undefined}
        containerColor={contained ? theme.colors.surface : undefined}
        iconColor={theme.colors.onSurface}
        style={styles.button}
        accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onPress={() => router.push('/notifications')}
      />
      {unread > 0 && (
        <View pointerEvents="none" accessible={false} style={styles.badge}>
          <Badge>{unread}</Badge>
        </View>
      )}
    </View>
  );
}

export function NotificationHeaderActions() {
  return (
    <View style={styles.actions}>
      <RefreshButton />
      <NotificationBell />
      <ThemeToggleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, margin: 0 },
  badge: { position: 'absolute', top: 3, right: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
