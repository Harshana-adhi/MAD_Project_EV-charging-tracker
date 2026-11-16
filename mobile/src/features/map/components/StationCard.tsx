import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, StatusBadge, ConnectorChip } from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';
import type { StationSummary } from '@/types/domain';

type StationCardProps = {
  station: StationSummary;
  onPress?: () => void;
  actions?: ReactNode;
  // Shows a close (x) button, e.g. for the card that pops up on the map.
  onClose?: () => void;
};

export function StationCard({ station, onPress, actions, onClose }: StationCardProps) {
  const theme = useAppTheme();
  const distanceText =
    station.distanceKm === undefined
      ? null
      : station.distanceKm < 1
        ? `${Math.round(station.distanceKm * 1000)} m`
        : `${station.distanceKm.toFixed(1)} km`;

  return (
    <Card onPress={onPress}>
      <View style={styles.headerRow}>
        <Text variant="titleMedium" style={styles.name}>
          {station.name}
        </Text>
        <StatusBadge
          status={
            station.availableCount > 0
              ? 'available'
              : station.onlineCount === 0
                ? 'offline'
                : 'busy'
          }
          count={`${station.availableCount}/${station.chargerCount}`}
        />
        {onClose ? (
          <IconButton
            icon="close"
            size={20}
            mode="contained-tonal"
            accessibilityLabel="Close station details"
            onPress={onClose}
            style={styles.close}
          />
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {station.address}
          {distanceText ? ` · ${distanceText}` : ''}
          {station.avgRating !== null ? ` · ${station.avgRating.toFixed(1)}` : ''}
        </Text>
        {station.avgRating !== null ? (
          <MaterialCommunityIcons name="star" size={14} color={theme.colors.tertiary} />
        ) : null}
      </View>
      <View style={styles.chipRow}>
        {station.connectors.map((connector) => (
          <ConnectorChip key={connector} connector={connector} />
        ))}
        {station.minRate !== null ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            from LKR {station.minRate} / kWh
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { flex: 1 },
  close: { margin: 0, marginTop: -4, marginRight: -6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
