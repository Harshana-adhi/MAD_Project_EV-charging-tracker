import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text, TouchableRipple } from 'react-native-paper';
import { AppButton, EmptyState, ErrorView, LoadingView, Screen, useSnackbar } from '@/components';
import { useAuth } from '@/features/auth';
import { notificationDestination } from '@/features/notifications/destination';
import { useNotificationActions, useNotifications } from '@/features/notifications/hooks';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { AppNotification } from '@/types/domain';

function formatAge(date: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(date)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return formatDate(date);
}

export default function NotificationsScreen() {
  const { user, loading } = useAuth();
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const inbox = useNotifications();
  const { markRead, markAllRead } = useNotificationActions();
  const busy = markRead.isPending || markAllRead.isPending;
  const hasUnread = inbox.data?.some(({ read }) => !read);

  async function openNotification(note: AppNotification) {
    if (!user || busy) return;
    try {
      if (!note.read) await markRead.mutateAsync(note.id);
      const destination = notificationDestination(note, user.role);
      if (destination) router.push(destination);
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
  }

  async function markInboxRead() {
    try {
      await markAllRead.mutateAsync();
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
  }

  return (
    <Screen
      title="Notifications"
      back
      scroll
      refreshing={inbox.isRefetching}
      onRefresh={user ? () => void inbox.refetch() : undefined}
    >
      {(loading || (user && inbox.isPending)) && <LoadingView />}
      {!loading && !user && (
        <EmptyState
          icon="bell-outline"
          title="Sign in required"
          message="Sign in to view your notifications."
        />
      )}
      {user && inbox.isError && (
        <ErrorView error={inbox.error} onRetry={() => void inbox.refetch()} />
      )}
      {user && inbox.isSuccess && inbox.data.length === 0 && (
        <EmptyState
          icon="bell-outline"
          title="No notifications yet"
          message="Updates about your account and activity will appear here."
        />
      )}
      {user && inbox.data && inbox.data.length > 0 && (
        <View style={styles.list}>
          <AppButton
            label="Mark all as read"
            mode="outlined"
            disabled={!hasUnread || busy}
            loading={markAllRead.isPending}
            onPress={() => void markInboxRead()}
          />
          {inbox.data.map((note) => (
            <TouchableRipple
              key={note.id}
              onPress={() => void openNotification(note)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${note.read ? 'Read' : 'Unread'}, ${note.title}, ${note.body}, ${formatAge(note.createdAt)}`}
              style={[
                styles.item,
                { backgroundColor: note.read ? theme.colors.surface : theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.row}>
                <View
                  style={[styles.dot, !note.read && { backgroundColor: theme.colors.primary }]}
                />
                <View style={styles.content}>
                  <Text variant="titleSmall" style={!note.read && styles.unread}>
                    {note.title}
                  </Text>
                  <Text variant="bodyMedium">{note.body}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatAge(note.createdAt)}
                  </Text>
                </View>
              </View>
            </TouchableRipple>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: { borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: spacing.xs },
  content: { flex: 1, gap: spacing.xs },
  unread: { fontWeight: '700' },
});
