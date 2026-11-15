import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, Text } from 'react-native-paper';
import { formatCredits, formatKwh } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import { periodLabel, shortMonthLabel } from '../labels';
import type { OwnerStatement } from '../types';

type OwnerStatementViewProps = {
  statement: OwnerStatement;
  onSelectMonth: (month: string) => void;
};

export function OwnerStatementView({ statement, onSelectMonth }: OwnerStatementViewProps) {
  const theme = useAppTheme();
  const secondary = { color: theme.colors.onSurfaceVariant };
  const monthName = periodLabel(statement.month).split(' ')[0];

  const lines: { label: string; value: string; color?: string }[] = [
    { label: 'Customer charges', value: formatCredits(statement.charged) },
    {
      label: 'Platform commission (5%)',
      value: `−${formatCredits(statement.commission)}`,
      color: theme.colors.money.debit,
    },
    { label: 'Withdrawals paid', value: formatCredits(statement.withdrawalsPaid) },
    {
      label: 'Sessions · energy',
      value: `${statement.sessions} · ${formatKwh(statement.kwh)}`,
    },
    { label: 'Best station', value: statement.bestStation?.name ?? 'No sessions yet' },
  ];

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {statement.months.map((month) => (
          <Chip
            key={month}
            selected={month === statement.month}
            showSelectedOverlay
            mode={month === statement.month ? 'flat' : 'outlined'}
            onPress={() => onSelectMonth(month)}
          >
            {shortMonthLabel(month)}
          </Chip>
        ))}
      </ScrollView>

      <Text variant="bodyMedium" style={secondary}>
        Earned in {monthName}
      </Text>
      <Text variant="displaySmall" style={styles.hero}>
        {formatCredits(statement.earned)}
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {lines.map((line, index) => (
          <View key={line.label}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.line}>
              <Text variant="bodyMedium" style={[styles.label, secondary]}>
                {line.label}
              </Text>
              <Text
                variant="bodyLarge"
                numberOfLines={1}
                style={[styles.value, line.color ? { color: line.color } : null]}
              >
                {line.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingBottom: spacing.lg },
  hero: { fontWeight: '600', fontVariant: ['tabular-nums'], marginBottom: spacing.lg },
  card: { borderRadius: 12, overflow: 'hidden' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: { flex: 1 },
  value: { flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
