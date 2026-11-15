import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, ErrorView, LoadingView, Screen } from '@/components';
import { useAuth } from '@/features/auth';
import { useAdminCounts } from '@/features/admin/hooks';
import { useAppTheme, spacing } from '@/lib/theme';
import type { AdminCounts } from '@/types/domain';

type CountCard = {
  key: keyof AdminCounts;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: Href;
};

const COUNT_CARDS: CountCard[] = [
  {
    key: 'pendingStations',
    label: 'Pending stations',
    icon: 'shield-check',
    route: { pathname: '/(admin)/stations', params: { status: 'pending' } },
  },
  {
    key: 'pendingTopups',
    label: 'Pending top-ups',
    icon: 'cash-plus',
    route: { pathname: '/(admin)/payments', params: { tab: 'topups' } },
  },
  {
    key: 'pendingWithdrawals',
    label: 'Pending withdrawals',
    icon: 'bank-transfer',
    route: { pathname: '/(admin)/payments', params: { tab: 'withdrawals' } },
  },
  { key: 'users', label: 'Users', icon: 'account-group', route: '/(admin)/users' },
];

export default function AdminDashboardScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { data: counts, isLoading, isError, error, refetch, isRefetching } = useAdminCounts();

  if (isLoading) return <LoadingView />;
  if (isError || !counts) return <ErrorView error={error} onRetry={refetch} />;

  const firstName = user?.fullName.split(' ')[0] ?? 'Admin';

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
      <Text variant="headlineSmall">Hello, {firstName}</Text>
      <Text variant="bodyMedium" style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        Here is what needs your attention.
      </Text>

      <View style={styles.grid}>
        {COUNT_CARDS.map((card) => (
          <View key={card.key} style={styles.cell}>
            <Card onPress={() => router.navigate(card.route)}>
              <View style={styles.cardTop}>
                <MaterialCommunityIcons name={card.icon} size={24} color={theme.colors.primary} />
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityLabel={`Open ${card.label.toLowerCase()}`}
                />
              </View>
              <Text variant="titleMedium" style={styles.count}>
                {counts[card.key]}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {card.label}
              </Text>
            </Card>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '48%' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { marginTop: spacing.sm, fontVariant: ['tabular-nums'] },
});
