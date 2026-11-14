import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme, spacing } from '@/lib/theme';

type StatusValue =
  | 'available'
  | 'busy'
  | 'offline'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'paid';

type StatusBucket = 'available' | 'busy' | 'offline' | 'pending' | 'approved' | 'rejected';

const BUCKET: Record<StatusValue, StatusBucket> = {
  available: 'available',
  busy: 'busy',
  offline: 'offline',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  active: 'busy',
  completed: 'approved',
  cancelled: 'rejected',
  disputed: 'rejected',
  paid: 'approved',
};

const ICON: Record<StatusBucket, keyof typeof MaterialCommunityIcons.glyphMap> = {
  available: 'check-circle',
  busy: 'lightning-bolt',
  offline: 'power-plug-off',
  pending: 'clock-outline',
  approved: 'check-decagram',
  rejected: 'close-circle',
};

type StatusBadgeProps = {
  status: StatusValue;
  count?: string;
};

export function StatusBadge({ status, count }: StatusBadgeProps) {
  const theme = useAppTheme();
  const bucket = BUCKET[status];
  const colors = theme.colors.status[bucket];
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <MaterialCommunityIcons name={ICON[bucket]} size={16} color={colors.text} />
      <Text variant="labelMedium" style={[styles.label, { color: colors.text }]}>
        {label}
        {count ? ` · ${count}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  label: { textTransform: 'capitalize' },
});
