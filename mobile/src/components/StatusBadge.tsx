import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { colors } from '@/lib/theme';

const STATUS_COLORS: Record<string, string> = {
  available: colors.available,
  approved: colors.available,
  paid: colors.available,
  completed: colors.available,
  active: colors.available,
  busy: colors.busy,
  pending: colors.busy,
  disputed: colors.busy,
  offline: colors.offline,
  cancelled: colors.offline,
  rejected: colors.error,
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? colors.offline;
  return (
    <Chip style={[styles.chip, { backgroundColor: color }]} textStyle={styles.text}>
      {status}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start' },
  text: { color: '#FFFFFF', textTransform: 'capitalize' },
});
