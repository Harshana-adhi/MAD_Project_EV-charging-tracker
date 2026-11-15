import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Divider, Text, TouchableRipple } from 'react-native-paper';
import { EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { useIncomeDetail } from '@/features/reports/hooks';
import { monthForKey, periodLabel } from '@/features/reports/labels';
import { formatCredits, formatKwh } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function IncomePeriodScreen() {
  const theme = useAppTheme();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { data: detail, isLoading, isError, error, refetch } = useIncomeDetail(key);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const secondary = { color: theme.colors.onSurfaceVariant };

  function renderContent() {
    if (isLoading) return <LoadingView />;
    if (isError || !detail) return <ErrorView error={error} onRetry={refetch} />;

    const tiles = [
      { label: 'Charged', value: formatCredits(detail.charged) },
      { label: 'Sessions', value: String(detail.sessions) },
      { label: 'Energy', value: formatKwh(detail.kwh) },
    ];

    return (
      <>
        <Text variant="bodyMedium" style={secondary}>
          Platform income
        </Text>
        <Text variant="displaySmall" style={styles.hero}>
          {formatCredits(detail.income)}
        </Text>

        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <View
              key={tile.label}
              style={[styles.tile, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <Text variant="bodySmall" style={secondary}>
                {tile.label}
              </Text>
              <Text variant="titleSmall" numberOfLines={1} style={styles.tabular}>
                {tile.value}
              </Text>
            </View>
          ))}
        </View>

        <Text variant="titleMedium" style={styles.section}>
          Owner income
        </Text>
        {detail.owners.length === 0 ? (
          <EmptyState
            icon="ev-station"
            title="No charging sessions"
            message="Owner income appears here once customers finish charging in this period."
          />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {detail.owners.map((owner, index) => (
              <View key={owner.ownerId}>
                {index > 0 ? <Divider /> : null}
                <TouchableRipple
                  accessibilityRole="button"
                  accessibilityLabel={`${owner.ownerName}, earned ${formatCredits(owner.earned)}. Open statement`}
                  onPress={() =>
                    router.push({
                      pathname: '/reports/owner/[id]',
                      params: { id: owner.ownerId, month: monthForKey(key, currentMonthKey()) },
                    })
                  }
                >
                  <View style={styles.ownerRow}>
                    <Text variant="labelLarge" style={[styles.rank, secondary]}>
                      {index + 1}
                    </Text>
                    <View style={styles.ownerText}>
                      <Text variant="bodyLarge" numberOfLines={1}>
                        {owner.ownerName}
                      </Text>
                      <Text variant="bodySmall" style={secondary}>
                        {owner.sessions === 1 ? '1 session' : `${owner.sessions} sessions`}
                      </Text>
                    </View>
                    <View style={styles.earned}>
                      <Text variant="bodyLarge" style={styles.tabular}>
                        {formatCredits(owner.earned)}
                      </Text>
                      <Text variant="bodySmall" style={secondary}>
                        earned
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              </View>
            ))}
          </View>
        )}
      </>
    );
  }

  return (
    <Screen
      title={key ? periodLabel(key) : 'Income'}
      back
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { fontWeight: '600', fontVariant: ['tabular-nums'], marginBottom: spacing.lg },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  card: { borderRadius: 12, overflow: 'hidden' },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rank: { width: 16 },
  ownerText: { flex: 1, minWidth: 0 },
  earned: { alignItems: 'flex-end' },
});
