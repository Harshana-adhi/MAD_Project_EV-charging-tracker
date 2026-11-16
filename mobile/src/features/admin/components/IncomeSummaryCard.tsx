import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { Logo } from '@/components';
import { changePercent } from '@/features/reports/labels';
import type { IncomeRow } from '@/features/reports/types';
import { useAppTheme, spacing } from '@/lib/theme';

type IncomeSummaryCardProps = {
  firstName: string;
  days: IncomeRow[];
  months: IncomeRow[];
};

type Figure = { label: string; value: number; previous: number };

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function sum(rows: IncomeRow[]): number {
  return rows.reduce((total, row) => total + row.income, 0);
}

function wholeLkr(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

function ChangeChip({ current, previous }: { current: number; previous: number }) {
  const theme = useAppTheme();
  const change = changePercent(current, previous);
  const colors =
    change === null
      ? { bg: theme.colors.surfaceVariant, text: theme.colors.onSurfaceVariant }
      : change >= 0
        ? theme.colors.status.approved
        : theme.colors.status.rejected;
  // With nothing to compare against, a first income is "New" and no income at all is a dash.
  const label =
    change === null ? (current > 0 ? 'New' : '–') : `${change >= 0 ? '+' : '−'}${Math.abs(change)}%`;

  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Text variant="labelSmall" style={{ color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}

export function IncomeSummaryCard({ firstName, days, months }: IncomeSummaryCardProps) {
  const theme = useAppTheme();
  const secondary = { color: theme.colors.onSurfaceVariant };
  const now = new Date();

  // days and months arrive newest first: days[0] is today, months[0] is this month.
  const figures: Figure[] = [
    { label: 'Today', value: days[0]?.income ?? 0, previous: days[1]?.income ?? 0 },
    { label: 'This week', value: sum(days.slice(0, 7)), previous: sum(days.slice(7, 14)) },
    { label: 'This month', value: months[0]?.income ?? 0, previous: months[1]?.income ?? 0 },
  ];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.brandRow}>
        <Logo size={26} withWordmark />
        <Text variant="bodySmall" style={secondary}>
          {now.toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <Text variant="titleMedium" style={styles.greeting}>
        {greeting(now.getHours())}, {firstName}
      </Text>
      <Text variant="bodySmall" style={secondary}>
        Here's how the platform is doing.
      </Text>

      <Divider style={styles.divider} />

      <View style={styles.figures}>
        {figures.map((figure, index) => (
          <View
            key={figure.label}
            style={[
              styles.figure,
              index > 0 ? [styles.figureBorder, { borderLeftColor: theme.colors.outlineVariant }] : null,
            ]}
          >
            <Text variant="bodySmall" style={secondary}>
              {figure.label}
            </Text>
            <Text variant="titleMedium" numberOfLines={1} style={styles.tabular}>
              {wholeLkr(figure.value)}
            </Text>
            <ChangeChip current={figure.value} previous={figure.previous} />
          </View>
        ))}
      </View>

      <Text variant="bodySmall" style={[styles.footnote, secondary]}>
        Platform income in LKR · compared with the previous period
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { marginTop: spacing.md },
  divider: { marginVertical: spacing.md },
  figures: { flexDirection: 'row' },
  figure: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  figureBorder: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.md },
  tabular: { fontVariant: ['tabular-nums'] },
  chip: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  footnote: { marginTop: spacing.md },
});
