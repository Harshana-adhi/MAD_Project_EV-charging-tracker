import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { formatCredits } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import { changePercent, comparedToLabel, periodLabel } from '../labels';
import type { IncomeRow as IncomeRowData } from '../types';

type IncomeRowProps = {
  row: IncomeRowData;
  previous?: IncomeRowData;
  maxIncome: number;
  onPress: () => void;
};

export function IncomeRow({ row, previous, maxIncome, onPress }: IncomeRowProps) {
  const theme = useAppTheme();
  const change = previous ? changePercent(row.income, previous.income) : null;
  // Say what the change is against, instead of a bare number or dash. Nothing to compare: no label.
  const changeText =
    change !== null
      ? `${change >= 0 ? '+' : '−'}${Math.abs(change)}% vs ${comparedToLabel(previous!.key)}`
      : previous && previous.income === 0 && row.income > 0
        ? `New · none in ${comparedToLabel(previous.key)}`
        : null;
  const barWidth = maxIncome > 0 ? Math.max((row.income / maxIncome) * 100, row.income > 0 ? 3 : 0) : 0;
  const changeColor =
    change === null
      ? theme.colors.onSurfaceVariant
      : change >= 0
        ? theme.colors.money.credit
        : theme.colors.money.debit;

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${periodLabel(row.key)}, ${formatCredits(row.income)}. Open details`}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text variant="bodyLarge">{periodLabel(row.key)}</Text>
          <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View
              style={[styles.bar, { width: `${barWidth}%`, backgroundColor: theme.colors.primary }]}
            />
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {row.sessions === 1 ? '1 session' : `${row.sessions} sessions`}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="titleMedium" style={styles.amount}>
            {formatCredits(row.income)}
          </Text>
          {changeText ? (
            <Text variant="labelSmall" style={{ color: change === null ? theme.colors.money.credit : changeColor }}>
              {changeText}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  left: { flex: 1, gap: spacing.xs },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontVariant: ['tabular-nums'] },
});
