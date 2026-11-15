import { StyleSheet, View } from 'react-native';
import { BarChart, type stackDataItem } from 'react-native-gifted-charts';
import { Text } from 'react-native-paper';
import type { EarningsDay } from '@/types/domain';
import { spacing, useAppTheme } from '@/lib/theme';

export function EarningsChart({ data }: { data: EarningsDay[] }) {
  const theme = useAppTheme();
  const chartData: stackDataItem[] = data.map((day) => ({
    label: new Date(`${day.day}T12:00:00`).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' }),
    stacks: [
      { value: day.earnings, color: theme.colors.primary },
      { value: day.commission, color: theme.colors.secondary },
    ],
  }));
  const width = Math.max(260, data.length * 38);

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
          <Text variant="labelMedium">Owner earnings</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.colors.secondary }]} />
          <Text variant="labelMedium">Commission</Text>
        </View>
      </View>
      <BarChart
        stackData={chartData}
        width={width}
        height={190}
        barWidth={16}
        spacing={18}
        initialSpacing={8}
        noOfSections={4}
        yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
        xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant }}
        rulesColor={theme.colors.outlineVariant}
        xAxisColor={theme.colors.outlineVariant}
        yAxisColor={theme.colors.outlineVariant}
        hideRules={false}
        isAnimated
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, overflow: 'scroll' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
