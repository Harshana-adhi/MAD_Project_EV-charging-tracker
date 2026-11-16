import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Text, TouchableRipple } from 'react-native-paper';
import { ErrorView, LoadingView, Screen } from '@/components';
import { useAuth } from '@/features/auth';
import {
  useAdminCounts,
  useAdminStations,
  useAdminTopups,
  useAdminWithdrawals,
} from '@/features/admin/hooks';
import { AttentionList } from '@/features/admin/components/AttentionList';
import { IncomeSummaryCard } from '@/features/admin/components/IncomeSummaryCard';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';
import { useIncome } from '@/features/reports/hooks';
import { useAppTheme, spacing } from '@/lib/theme';
import type { AdminCounts } from '@/types/domain';

type CountTile = { key: keyof AdminCounts; label: string; route: Href };

const COUNT_TILES: CountTile[] = [
  {
    key: 'pendingStations',
    label: 'Stations',
    route: { pathname: '/(admin)/stations', params: { status: 'pending' } },
  },
  {
    key: 'pendingTopups',
    label: 'Top-ups',
    route: { pathname: '/(admin)/payments', params: { tab: 'topups' } },
  },
  {
    key: 'pendingWithdrawals',
    label: 'Payouts',
    route: { pathname: '/(admin)/payments', params: { tab: 'withdrawals' } },
  },
  { key: 'users', label: 'Users', route: '/(admin)/users' },
];

export default function AdminDashboardScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const counts = useAdminCounts();
  const days = useIncome('day');
  const months = useIncome('month');
  const stations = useAdminStations('pending');
  const topups = useAdminTopups('pending');
  const withdrawals = useAdminWithdrawals('pending');
  const queries = [counts, days, months, stations, topups, withdrawals];

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all(queries.map((query) => query.refetch())),
  );

  if (queries.some((query) => query.isLoading)) return <LoadingView />;
  const failed = queries.find((query) => query.isError);
  if (failed) return <ErrorView error={failed.error} onRetry={onRefresh} />;

  const firstName = user?.fullName.split(' ')[0] ?? 'Admin';

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.content}>
        <IncomeSummaryCard firstName={firstName} days={days.data ?? []} months={months.data ?? []} />

        <AttentionList
          stations={stations.data ?? []}
          topups={topups.data ?? []}
          withdrawals={withdrawals.data ?? []}
        />

        <View style={styles.tiles}>
          {COUNT_TILES.map((tile) => (
            <TouchableRipple
              key={tile.key}
              onPress={() => router.navigate(tile.route)}
              accessibilityRole="button"
              accessibilityLabel={`${tile.label}: ${counts.data?.[tile.key] ?? 0}`}
              style={[
                styles.tile,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
            >
              <View style={styles.tileInner}>
                <Text variant="titleMedium" style={styles.tabular}>
                  {counts.data?.[tile.key] ?? 0}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {tile.label}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tileInner: { alignItems: 'center', paddingVertical: spacing.md, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
});
