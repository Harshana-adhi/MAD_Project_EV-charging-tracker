import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, Searchbar } from 'react-native-paper';
import {
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { useAuth } from '@/features/auth';
import { PasswordDialog } from '@/features/admin/components/PasswordDialog';
import { UserDetailsDialog } from '@/features/admin/components/UserDetailsDialog';
import { UserRow } from '@/features/admin/components/UserRow';
import {
  useAdminUsers,
  useResetUserPassword,
  useSetUserBlocked,
} from '@/features/admin/hooks';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';
import type { User } from '@/types/domain';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';

const SEARCH_DELAY_MS = 300;

type Filter = 'all' | 'customer' | 'owner' | 'blocked';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'owner', label: 'Owners' },
  { value: 'blocked', label: 'Blocked' },
];

function matchesFilter(user: User, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'blocked') return user.isBlocked;
  return user.role === filter;
}

export default function AdminUsersScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { user: currentUser } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data: users, isLoading, isError, error, refetch } = useAdminUsers(search);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const setUserBlocked = useSetUserBlocked();
  const resetUserPassword = useResetUserPassword();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);

  // Wait until typing stops so the list is not requested on every key press.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const counts = useMemo(() => {
    const list = users ?? [];
    return Object.fromEntries(
      FILTERS.map((item) => [item.value, list.filter((u) => matchesFilter(u, item.value)).length]),
    ) as Record<Filter, number>;
  }, [users]);

  const visibleUsers = useMemo(
    () => (users ?? []).filter((u) => matchesFilter(u, filter)),
    [users, filter],
  );

  function canBlock(target: User): boolean {
    return target.role !== 'admin' && target.id !== currentUser?.id;
  }

  async function confirmBlock() {
    if (!userToBlock) return;
    const target = userToBlock;
    setUserToBlock(null);
    try {
      await setUserBlocked.mutateAsync({ id: target.id, blocked: !target.isBlocked });
      snackbar.show(target.isBlocked ? `${target.fullName} unblocked` : `${target.fullName} blocked`);
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

  function renderList() {
    if (isLoading) return <LoadingView />;
    if (isError || !users) return <ErrorView error={error} onRetry={refetch} />;
    return (
      <FlatList
        data={visibleUsers}
        keyExtractor={(user) => user.id}
        renderItem={({ item }) => <UserRow user={item} onPress={() => setSelectedUser(item)} />}
        ItemSeparatorComponent={Divider}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyboardShouldPersistTaps="handled"
        style={[styles.list, { backgroundColor: theme.colors.surface }]}
        ListEmptyComponent={
          <EmptyState
            icon="account-search"
            title="No users found"
            message={
              search || filter !== 'all'
                ? 'Try a different name, email or filter.'
                : 'Registered users will appear here.'
            }
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
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((item) => (
            <Chip
              key={item.value}
              selected={filter === item.value}
              showSelectedOverlay
              mode={filter === item.value ? 'flat' : 'outlined'}
              onPress={() => setFilter(item.value)}
            >
              {`${item.label} ${counts[item.value]}`}
            </Chip>
          ))}
        </ScrollView>
      </View>
      {renderList()}

      {selectedUser ? (
        <UserDetailsDialog
          user={selectedUser}
          canBlock={canBlock(selectedUser)}
          onDismiss={() => setSelectedUser(null)}
          onBlock={() => {
            setUserToBlock(selectedUser);
            setSelectedUser(null);
          }}
          onResetPassword={() => {
            setUserToReset(selectedUser);
            setSelectedUser(null);
          }}
        />
      ) : null}
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
  search: { marginBottom: spacing.md },
  chips: { gap: spacing.sm, paddingBottom: spacing.md },
  list: { flex: 1, borderRadius: 12 },
});
