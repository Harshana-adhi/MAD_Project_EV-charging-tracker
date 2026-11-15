import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, IconButton, Menu, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { useAuth } from '@/features/auth';
import { PasswordDialog } from '@/features/admin/components/PasswordDialog';
import {
  useAdminUsers,
  useResetUserPassword,
  useSetUserBlocked,
} from '@/features/admin/hooks';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';
import type { Role, User } from '@/types/domain';

const SEARCH_DELAY_MS = 300;

const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  owner: 'Station owner',
  admin: 'Admin',
};

export default function AdminUsersScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { user: currentUser } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const { data: users, isLoading, isError, error, refetch, isRefetching } = useAdminUsers(search);
  const setUserBlocked = useSetUserBlocked();
  const resetUserPassword = useResetUserPassword();
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);

  // Wait until typing stops so the list is not requested on every key press.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  async function confirmBlock() {
    if (!userToBlock) return;
    const target = userToBlock;
    setUserToBlock(null);
    try {
      await setUserBlocked.mutateAsync({ id: target.id, blocked: !target.isBlocked });
      snackbar.show(target.isBlocked ? 'User unblocked' : 'User blocked');
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  async function submitPassword(newPassword: string) {
    if (!userToReset) return;
    const target = userToReset;
    setUserToReset(null);
    try {
      await resetUserPassword.mutateAsync({ id: target.id, newPassword });
      snackbar.show(`Password reset for ${target.fullName}`);
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  function renderUser({ item }: { item: User }) {
    const canBlock = item.role !== 'admin' && item.id !== currentUser?.id;

    return (
      <Card
        title={item.fullName}
        subtitle={item.email}
        right={
          <Menu
            visible={menuUserId === item.id}
            onDismiss={() => setMenuUserId(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                accessibilityLabel={`Options for ${item.fullName}`}
                onPress={() => setMenuUserId(item.id)}
              />
            }
          >
            {canBlock ? (
              <Menu.Item
                leadingIcon={item.isBlocked ? 'account-check' : 'account-cancel'}
                title={item.isBlocked ? 'Unblock' : 'Block'}
                onPress={() => {
                  setMenuUserId(null);
                  setUserToBlock(item);
                }}
              />
            ) : null}
            <Menu.Item
              leadingIcon="lock-reset"
              title="Reset password"
              onPress={() => {
                setMenuUserId(null);
                setUserToReset(item);
              }}
            />
          </Menu>
        }
      >
        <View style={styles.badges}>
          <Chip compact icon="account">
            {ROLE_LABEL[item.role]}
          </Chip>
          {item.isBlocked ? (
            <View style={[styles.blockedBadge, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons
                name="account-cancel"
                size={16}
                color={theme.colors.onErrorContainer}
              />
              <Text variant="labelMedium" style={{ color: theme.colors.onErrorContainer }}>
                Blocked
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    );
  }

  function renderContent() {
    if (isLoading) return <LoadingView />;
    if (isError || !users) return <ErrorView error={error} onRetry={refetch} />;
    return (
      <FlatList
        data={users}
        keyExtractor={(user) => user.id}
        renderItem={renderUser}
        refreshing={isRefetching}
        onRefresh={refetch}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="account-search"
            title="No users found"
            message={search ? 'Try a different name or email.' : 'Registered users will appear here.'}
          />
        }
      />
    );
  }

  return (
    <Screen>
      <Searchbar
        placeholder="Search by name or email"
        value={searchText}
        onChangeText={setSearchText}
        style={styles.search}
      />
      {renderContent()}

      <ConfirmDialog
        visible={!!userToBlock}
        title={userToBlock?.isBlocked ? 'Unblock user?' : 'Block user?'}
        message={
          userToBlock?.isBlocked
            ? `${userToBlock.fullName} will be able to log in and use the app again.`
            : `${userToBlock?.fullName ?? 'This user'} will be logged out and unable to use the app.`
        }
        confirmLabel={userToBlock?.isBlocked ? 'Unblock' : 'Block'}
        danger={userToBlock ? !userToBlock.isBlocked : false}
        onConfirm={confirmBlock}
        onDismiss={() => setUserToBlock(null)}
      />
      {userToReset ? (
        <PasswordDialog
          userName={userToReset.fullName}
          onSubmit={submitPassword}
          onDismiss={() => setUserToReset(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: spacing.lg },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
