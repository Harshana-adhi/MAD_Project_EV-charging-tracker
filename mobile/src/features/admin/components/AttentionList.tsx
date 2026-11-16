import { StyleSheet, View } from 'react-native';
import { type Href, router } from 'expo-router';
import { Divider, Text, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCredits } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import type { AdminStation, AdminTopup, AdminWithdrawal } from '@/types/domain';

const MAX_ITEMS = 4;

type Kind = 'station' | 'topup' | 'withdrawal';

type AttentionItem = {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  createdAt: string;
  route: Href;
};

const ICON: Record<Kind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  station: 'ev-station',
  topup: 'cash-plus',
  withdrawal: 'bank-transfer',
};

type AttentionListProps = {
  stations: AdminStation[];
  topups: AdminTopup[];
  withdrawals: AdminWithdrawal[];
};

export function AttentionList({ stations, topups, withdrawals }: AttentionListProps) {
  const theme = useAppTheme();
  const secondary = { color: theme.colors.onSurfaceVariant };

  const kindColors: Record<Kind, { bg: string; text: string }> = {
    station: theme.colors.status.busy,
    topup: theme.colors.status.pending,
    withdrawal: { bg: theme.colors.secondaryContainer, text: theme.colors.onSecondaryContainer },
  };

  const items: AttentionItem[] = [
    ...stations.map((station) => ({
      id: station.id,
      kind: 'station' as const,
      title: station.name,
      subtitle: 'Station waiting for approval',
      createdAt: station.createdAt,
      route: { pathname: '/(admin)/stations', params: { status: 'pending' } } as Href,
    })),
    ...topups.map((topup) => ({
      id: topup.id,
      kind: 'topup' as const,
      title: `${formatCredits(topup.amount)} slip top-up`,
      subtitle: topup.userName,
      createdAt: topup.createdAt,
      route: { pathname: '/(admin)/payments', params: { tab: 'topups' } } as Href,
    })),
    ...withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      kind: 'withdrawal' as const,
      title: `${formatCredits(withdrawal.amount)} withdrawal`,
      subtitle: withdrawal.ownerName,
      createdAt: withdrawal.createdAt,
      route: { pathname: '/(admin)/payments', params: { tab: 'withdrawals' } } as Href,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <View>
      <View style={styles.header}>
        <Text variant="titleMedium">Needs your attention</Text>
        {items.length > 0 ? (
          <Text variant="labelLarge" style={secondary}>
            {items.length}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        ]}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={secondary}>
              All caught up. Nothing is waiting for you.
            </Text>
          </View>
        ) : (
          items.slice(0, MAX_ITEMS).map((item, index) => (
            <View key={`${item.kind}-${item.id}`}>
              {index > 0 ? <Divider /> : null}
              <TouchableRipple
                onPress={() => router.navigate(item.route)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. Review`}
              >
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: kindColors[item.kind].bg }]}>
                    <MaterialCommunityIcons
                      name={ICON[item.kind]}
                      size={18}
                      color={kindColors[item.kind].text}
                    />
                  </View>
                  <View style={styles.text}>
                    <Text variant="bodyLarge" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="bodySmall" numberOfLines={1} style={secondary}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                    Review ›
                  </Text>
                </View>
              </TouchableRipple>
            </View>
          ))
        )}
      </View>
      {items.length > MAX_ITEMS ? (
        <Text variant="bodySmall" style={[styles.more, secondary]}>
          +{items.length - MAX_ITEMS} more below
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  more: { marginTop: spacing.xs },
});
