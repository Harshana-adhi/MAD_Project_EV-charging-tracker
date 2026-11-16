import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IncomeRow } from '@/features/reports/types';
import { useAppTheme, spacing } from '@/lib/theme';
import type { StationSummary } from '@/types/domain';

// Style guide estimate for the eco line: each kWh charged saves about 0.5 kg of CO2 vs petrol.
const CO2_KG_PER_KWH = 0.5;

type PlatformSnapshotProps = {
  stations: StationSummary[];
  month?: IncomeRow;
};

function compactNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function PlatformSnapshot({ stations, month }: PlatformSnapshotProps) {
  const theme = useAppTheme();
  const secondary = { color: theme.colors.onSurfaceVariant };
  const cardStyle = [
    styles.card,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
  ];

  const chargers = stations.reduce((sum, station) => sum + station.chargerCount, 0);
  const free = stations.reduce((sum, station) => sum + station.availableCount, 0);
  const kwh = month?.kwh ?? 0;

  const impact = [
    { label: 'sessions', value: compactNumber(month?.sessions ?? 0) },
    { label: 'kWh delivered', value: compactNumber(kwh) },
    { label: 'kg CO₂ saved', value: compactNumber(kwh * CO2_KG_PER_KWH) },
  ];

  return (
    <View style={styles.row}>
      <View style={cardStyle}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="ev-station" size={18} color={theme.colors.primary} />
          <Text variant="labelLarge">Network now</Text>
        </View>
        <Text variant="headlineSmall" style={styles.tabular}>
          {free}
          <Text variant="titleMedium" style={secondary}>
            {` of ${chargers}`}
          </Text>
        </Text>
        <Text variant="bodySmall" style={secondary}>
          chargers free
        </Text>
        <ProgressBar
          progress={chargers > 0 ? free / chargers : 0}
          color={theme.colors.primary}
          style={[styles.progress, { backgroundColor: theme.colors.surfaceVariant }]}
        />
        <Text variant="bodySmall" style={secondary}>
          {stations.length === 1 ? '1 live station' : `${stations.length} live stations`}
        </Text>
      </View>

      <View style={cardStyle}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="leaf" size={18} color={theme.colors.primary} />
          <Text variant="labelLarge">This month</Text>
        </View>
        {impact.map((item) => (
          <View key={item.label} style={styles.impactLine}>
            <Text variant="titleMedium" style={styles.tabular}>
              {item.value}
            </Text>
            <Text variant="bodySmall" style={secondary}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  progress: { height: 6, borderRadius: 3, marginVertical: spacing.xs },
  impactLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
});
