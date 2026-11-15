import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Divider, SegmentedButtons, Text } from 'react-native-paper';
import { ErrorView, LoadingView, Screen } from '@/components';
import { IncomeRow } from '@/features/reports/components/IncomeRow';
import { useIncome } from '@/features/reports/hooks';
import type { IncomePeriod } from '@/features/reports/types';
import { formatCredits } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';

const PERIOD_BUTTONS = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const SUMMARY: Record<IncomePeriod, { current: string; total: string }> = {
  day: { current: 'Today', total: 'Last 14 days' },
  month: { current: 'This month', total: 'Last 12 months' },
  year: { current: 'This year', total: 'Last 5 years' },
};

export default function AdminReportsScreen() {
  const theme = useAppTheme();
  const [period, setPeriod] = useState<IncomePeriod>('month');
  const { data: rows, isLoading, isError, error, refetch, isRefetching } = useIncome(period);

  function renderContent() {
    if (isLoading) return <LoadingView />;
    if (isError || !rows) return <ErrorView error={error} onRetry={refetch} />;

    const maxIncome = Math.max(...rows.map((row) => row.income), 0);
    const total = rows.reduce((sum, row) => sum + row.income, 0);

    return (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        refreshing={isRefetching}
        onRefresh={refetch}
        ItemSeparatorComponent={Divider}
        ListHeaderComponent={
          <View style={styles.summary}>
            {[
              { label: SUMMARY[period].current, value: rows[0]?.income ?? 0 },
              { label: SUMMARY[period].total, value: total },
            ].map((tile) => (
              <View
                key={tile.label}
                style={[styles.tile, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {tile.label}
                </Text>
                <Text variant="titleMedium" style={styles.tabular}>
                  {formatCredits(tile.value)}
                </Text>
              </View>
            ))}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ backgroundColor: theme.colors.surface }}>
            <IncomeRow
              row={item}
              previous={rows[index + 1]}
              maxIncome={maxIncome}
              onPress={() =>
                router.push({ pathname: '/reports/period/[key]', params: { key: item.key } })
              }
            />
          </View>
        )}
        ListFooterComponent={
          <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
            Platform income is the 5% commission from completed charging sessions.
          </Text>
        }
      />
    );
  }

  return (
    <Screen>
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as IncomePeriod)}
        buttons={PERIOD_BUTTONS}
        style={styles.segments}
      />
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { marginBottom: spacing.lg },
  summary: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  tile: { flex: 1, borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  footer: { marginTop: spacing.md },
});
