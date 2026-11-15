import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { Card, StatusBadge } from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';
import type { StationDetail } from '@/types/domain';

type OwnerStationCardProps = { station: StationDetail; onPress: () => void };

export function OwnerStationCard({ station, onPress }: OwnerStationCardProps) {
  const theme = useAppTheme();
  const photo = station.photos[0];

  return (
    <Card onPress={onPress}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="ev-station" size={36} color={theme.colors.onSurfaceVariant} />
        </View>
      )}
      <View style={styles.details}>
        <View style={styles.statusRow}>
          <StatusBadge status={station.status} />
          <Text variant="labelLarge">
            {station.chargerCount} {station.chargerCount === 1 ? 'charger' : 'chargers'}
          </Text>
        </View>
        <Text variant="titleMedium">{station.name}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {station.address}
        </Text>
        {station.status === 'rejected' && station.rejectReason ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {station.rejectReason}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 156, borderRadius: 12 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  details: { gap: spacing.sm, paddingTop: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
