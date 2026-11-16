import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type DateTileProps = {
  iso: string;
  // 'accent' for upcoming things, 'muted' for the past.
  tone?: 'accent' | 'muted';
  size?: 'small' | 'large';
};

// A calendar-style tile: the day number with the month above it, in Colombo time.
export function DateTile({ iso, tone = 'muted', size = 'small' }: DateTileProps) {
  const theme = useAppTheme();
  const date = new Date(iso);
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Colombo' }).toUpperCase();
  const day = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Colombo' });
  const accent = tone === 'accent';
  const large = size === 'large';

  return (
    <View
      style={[
        styles.tile,
        large ? styles.large : styles.small,
        { backgroundColor: accent ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
      ]}
    >
      <Text
        variant="labelSmall"
        style={[styles.month, { color: accent ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}
      >
        {month}
      </Text>
      <Text
        variant={large ? 'headlineSmall' : 'titleMedium'}
        style={[styles.day, { color: accent ? theme.colors.onPrimaryContainer : theme.colors.onSurface }]}
      >
        {day}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  small: { width: 48, height: 52 },
  large: { width: 62, height: 68 },
  month: { letterSpacing: 0.8, fontWeight: '600' },
  day: { fontWeight: '700', marginTop: -2 },
});
