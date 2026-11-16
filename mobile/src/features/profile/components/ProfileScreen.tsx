import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Chip, Divider, List, Text } from 'react-native-paper';
import { ConfirmDialog, EmptyState, ErrorView, LoadingView, Logo, Screen, useSnackbar } from '@/components';
import { useAuth } from '@/features/auth';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';
import { useThemePreference, type ThemePreference } from '@/lib/themePreference';
import type { Role } from '@/types/domain';
import { useDeleteAccount, useProfile } from '../hooks';
import { AppearanceDialog } from './AppearanceDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';
import { useAdminShortcuts } from '@/features/admin/components/AdminMenu';

const DELETE_ACCOUNT_MESSAGES: Record<string, string> = {
  ACTIVE_SESSION_EXISTS: 'End your active charging session before deleting your account.',
  BOOKING_EXISTS: 'Cancel your upcoming booking before deleting your account.',
  INVALID_CREDENTIALS: 'Incorrect password.',
};

function deleteAccountErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);
  return DELETE_ACCOUNT_MESSAGES[code] ?? errorMessage(err);
}

const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  owner: 'Station owner',
  admin: 'Admin',
};

const ROLE_ICON: Record<Role, string> = {
  customer: 'account',
  owner: 'ev-station',
  admin: 'shield-account',
};

const APPEARANCE_LABEL: Record<ThemePreference, string> = {
  system: 'Use phone setting',
  light: 'Light',
  dark: 'Dark',
};

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function ProfileScreen() {
  const theme = useAppTheme();
  const { user, role, signOut } = useAuth();
  const { preference } = useThemePreference();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const snackbar = useSnackbar();
  const deleteAccount = useDeleteAccount();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  if (!user) {
    return (
      <Screen>
        <EmptyState
          icon="account-circle"
          title="Log in to continue"
          message="Sign in to see your profile, vehicles and settings."
          actionLabel="Log in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  if (isLoading) return <LoadingView />;
  if (isError || !profile) return <ErrorView error={error} onRetry={refetch} />;

  async function logOut() {
    setLogoutOpen(false);
    await signOut();
    router.replace('/');
  }

  async function confirmDeleteAccount(password: string) {
    setDeleteError(undefined);
    try {
      await deleteAccount.mutateAsync(password);
      setDeleteOpen(false);
      await signOut();
      router.replace('/');
      snackbar.show('Your account has been deleted');
    } catch (err) {
      setDeleteError(deleteAccountErrorMessage(err));
    }
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Avatar.Text size={64} label={initials(profile.fullName)} />
        <View style={styles.headerText}>
          <Text variant="titleLarge">{profile.fullName}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {profile.email}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {profile.phone ?? 'No phone number added'}
          </Text>
          <Chip compact icon={ROLE_ICON[profile.role]} style={styles.roleChip}>
            {ROLE_LABEL[profile.role]}
          </Chip>
        </View>
      </View>

      {role === 'admin' ? <AdminTools /> : <Divider />}
      <List.Item
        title="Edit profile"
        left={(props) => <List.Icon {...props} icon="pencil" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push('/profile/edit')}
      />
      <List.Item
        title="Change password"
        left={(props) => <List.Icon {...props} icon="lock-reset" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push('/password/change')}
      />
      {role === 'customer' ? (
        <List.Item
          title="My vehicles"
          left={(props) => <List.Icon {...props} icon="car-electric" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/vehicles')}
        />
      ) : null}
      {role === 'customer' ? (
        <List.Item
          title="My bookings"
          left={(props) => <List.Icon {...props} icon="calendar-clock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/bookings')}
        />
      ) : null}
      {role === 'owner' ? (
        <List.Item
          title="Monthly reports"
          left={(props) => <List.Icon {...props} icon="chart-bar" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/reports/mine')}
        />
      ) : null}
      {role === 'customer' || role === 'owner' ? (
        <List.Item
          title="Transaction history"
          left={(props) => <List.Icon {...props} icon="swap-vertical" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/transactions')}
        />
      ) : null}
      {role === 'customer' ? (
        <List.Item
          title="Favourites"
          left={(props) => <List.Icon {...props} icon="heart-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/favourites')}
        />
      ) : null}
      <List.Item
        title="Notifications"
        left={(props) => <List.Icon {...props} icon="bell" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push('/notifications')}
      />
      <List.Item
        title="Appearance"
        description={APPEARANCE_LABEL[preference]}
        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
        onPress={() => setAppearanceOpen(true)}
      />
      <Divider />
      <List.Item
        title="Log out"
        titleStyle={{ color: theme.colors.error }}
        left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
        onPress={() => setLogoutOpen(true)}
      />
      {role === 'customer' || role === 'owner' ? (
        <List.Item
          title="Delete account"
          titleStyle={{ color: theme.colors.error }}
          left={(props) => <List.Icon {...props} icon="account-remove" color={theme.colors.error} />}
          onPress={() => {
            setDeleteError(undefined);
            setDeleteOpen(true);
          }}
        />
      ) : null}

      <View style={styles.about}>
        <Logo size={22} withWordmark />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Version 1.0.0
        </Text>
      </View>

      <AppearanceDialog visible={appearanceOpen} onDismiss={() => setAppearanceOpen(false)} />
      <ConfirmDialog
        visible={logoutOpen}
        title="Log out?"
        message="You will need to log in again to use your account."
        confirmLabel="Log out"
        danger
        onConfirm={logOut}
        onDismiss={() => setLogoutOpen(false)}
      />
      {deleteOpen ? (
        <DeleteAccountDialog
          loading={deleteAccount.isPending}
          error={deleteError}
          onConfirm={confirmDeleteAccount}
          onDismiss={() => setDeleteOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

// Admin-only shortcuts, with how many things are waiting on each.
function AdminTools() {
  const theme = useAppTheme();
  const items = useAdminShortcuts().filter((item) => item.label !== 'Map');
  return (
    <>
      <List.Subheader style={{ color: theme.colors.primary }}>Admin tools</List.Subheader>
      {items.map((item) => (
        <List.Item
          key={item.label}
          title={item.label}
          description={item.hint}
          left={(props) => <List.Icon {...props} icon={item.icon} />}
          right={(props) => (
            <View style={styles.adminRight}>
              {item.count ? (
                <View style={[styles.adminCount, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onPrimary }}>
                    {item.count} waiting
                  </Text>
                </View>
              ) : null}
              <List.Icon {...props} icon="chevron-right" />
            </View>
          )}
          onPress={() => router.push(item.href)}
        />
      ))}
      <Divider />
      <List.Subheader style={{ color: theme.colors.primary }}>Account</List.Subheader>
    </>
  );
}

const styles = StyleSheet.create({
  adminRight: { flexDirection: 'row', alignItems: 'center' },
  adminCount: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  headerText: { flex: 1, gap: spacing.xs },
  roleChip: { alignSelf: 'flex-start', marginTop: spacing.xs },
  about: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl, marginBottom: spacing.sm },
});
