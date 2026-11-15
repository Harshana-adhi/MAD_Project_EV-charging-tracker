import { Image, Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBadge } from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';
import type { AdminStation } from '@/types/domain';
import { ApprovalActions } from './ApprovalActions';

const THUMBNAIL_SIZE = 64;

type StationApprovalCardProps = {
  station: AdminStation;
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

function openInMaps(station: AdminStation) {
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`,
  );
}

export function StationApprovalCard({
  station,
  disabled,
  onApprove,
  onReject,
}: StationApprovalCardProps) {
  const theme = useAppTheme();
  const secondaryText = { color: theme.colors.onSurfaceVariant };
  const chargerText = station.chargerCount === 1 ? '1 charger' : `${station.chargerCount} chargers`;

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          {station.photos[0] ? (
            <Image
              source={{ uri: station.photos[0] }}
              style={styles.thumbnail}
              accessibilityLabel={`Photo of ${station.name}`}
            />
          ) : (
            <View
              style={[
                styles.thumbnail,
                styles.placeholder,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <MaterialCommunityIcons
                name="ev-station"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
          <View style={styles.details}>
            <Text variant="titleMedium">{station.name}</Text>
            <Text variant="bodySmall" style={secondaryText}>
              {station.address}
            </Text>
            <Text variant="bodySmall" style={secondaryText}>
              Owner: {station.ownerName} · {chargerText}
            </Text>
            <StatusBadge status={station.status} />
          </View>
        </View>

        {station.rejectReason ? (
          <Text variant="bodySmall" style={[styles.reason, secondaryText]}>
            Reason: {station.rejectReason}
          </Text>
        ) : null}

        <Button
          mode="text"
          icon="map-marker"
          style={styles.mapsButton}
          onPress={() => openInMaps(station)}
        >
          Open in Google Maps
        </Button>

        {station.status === 'pending' ? (
          <ApprovalActions
            approveLabel="Approve"
            onApprove={onApprove}
            onReject={onReject}
            disabled={disabled}
          />
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  thumbnail: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: spacing.sm },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, gap: spacing.xs },
  reason: { marginTop: spacing.sm },
  mapsButton: { alignSelf: 'flex-start', marginTop: spacing.sm },
});
