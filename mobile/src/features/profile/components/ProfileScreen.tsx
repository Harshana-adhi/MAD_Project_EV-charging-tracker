import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Chip, Divider, List, Text } from 'react-native-paper';
import { ConfirmDialog, EmptyState, ErrorView, LoadingView, Logo, Screen } from '@/components';
import { useAuth } from '@/features/auth';
import { useAppTheme, spacing } from '@/lib/theme';
import { useThemePreference, type ThemePreference } from '@/lib/themePreference';
import type { Role } from '@/types/domain';
import { useProfile } from '../hooks';
import { AppearanceDialog } from './AppearanceDialog';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';

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
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

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

      <Divider />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  headerText: { flex: 1, gap: spacing.xs },
  roleChip: { alignSelf: 'flex-start', marginTop: spacing.xs },
  about: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl, marginBottom: spacing.sm },
});
