import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chip, Divider, Text } from 'react-native-paper';
import { Credits, EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { useAuth } from '@/features/auth';
import { useTransactions } from '@/features/payments/hooks';
import { formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { TxnType } from '@/types/domain';

const transactionTypes = {
  topup: { label: 'Top-up', filter: 'Top-ups', icon: 'wallet-outline' },
  charge: { label: 'Charge', filter: 'Charges', icon: 'ev-station' },
  earning: { label: 'Earning', filter: 'Earnings', icon: 'cash-plus' },
  withdrawal: { label: 'Withdrawal', filter: 'Withdrawals', icon: 'bank-transfer-out' },
  hold: { label: 'Hold', filter: 'Holds', icon: 'lock-outline' },
  release: { label: 'Release', filter: 'Releases', icon: 'lock-open-outline' },
  commission: { label: 'Commission', filter: 'Commissions', icon: 'percent' },
} satisfies Record<
  TxnType,
  { label: string; filter: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
>;

// Each role only gets the filters that can actually appear in its wallet. Commission is
// the platform's own entry, so neither customers nor owners ever see it.
const customerFilters: TxnType[] = ['topup', 'charge', 'hold', 'release'];
const ownerFilters: TxnType[] = ['earning', 'withdrawal', 'charge'];

export default function TransactionHistoryScreen() {
  const theme = useAppTheme();
  const { user, loading, role } = useAuth();
  const filters = [undefined, ...(role === 'owner' ? ownerFilters : customerFilters)];
  const [type, setType] = useState<TxnType>();
  const { data, isPending, isError, error, isRefetching, refetch } = useTransactions(type);

  return (
    <Screen
      title="Transaction history"
      back
      scroll
      refreshing={isRefetching}
      onRefresh={user ? () => void refetch() : undefined}
    >
      {user && (
        <View style={styles.filters}>
          {filters.map((filter) => (
            <Chip
              key={filter ?? 'all'}
              selected={filter === type}
              onPress={() => setType(filter)}
              style={styles.filter}
            >
              {filter ? transactionTypes[filter].filter : 'All'}
            </Chip>
          ))}
        </View>
      )}

      {(loading || (user && isPending)) && <LoadingView />}
      {!loading && !user && (
        <EmptyState
          icon="wallet-outline"
          title="Sign in required"
          message="Sign in to view your transactions."
        />
      )}
      {user && isError && <ErrorView error={error} onRetry={() => void refetch()} />}
      {user && !isError && data?.length === 0 && (
        <EmptyState
          icon="receipt-text-outline"
          title={type ? 'No matching transactions' : 'No transactions yet'}
          message={type ? 'Choose another filter.' : 'Your credit activity will appear here.'}
          actionLabel={type ? 'Show all' : undefined}
          onAction={type ? () => setType(undefined) : undefined}
        />
      )}
      {user && data?.map((transaction) => {
        const { label, icon } = transactionTypes[transaction.type];
        return (
          <View key={transaction.id}>
            <View style={styles.row}>
              <MaterialCommunityIcons name={icon} size={24} color={theme.colors.onSurfaceVariant} />
              <View style={styles.details}>
                <Text variant="titleSmall">{label}</Text>
                {transaction.note ? <Text variant="bodyMedium">{transaction.note}</Text> : null}
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatDate(transaction.createdAt)}
                </Text>
              </View>
              <Credits
                amount={transaction.amount}
                signed
                neutral={transaction.type === 'hold' || transaction.type === 'release'}
                variant="titleSmall"
              />
            </View>
            <Divider />
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  filter: { minHeight: 48, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  details: { flex: 1, gap: spacing.xs },
});
