import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import type { SessionWithNames } from '@/types/domain';
import { formatCredits, formatDuration, formatKwh } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import { meterReading } from './meterReading';

// stoppedAt freezes the reading at that moment, e.g. while a stop request is on its way.
export function useMeter(session: SessionWithNames, stoppedAt?: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return meterReading(session, stoppedAt ?? now);
}

export function Meter({ session, reading }: { session: SessionWithNames; reading: ReturnType<typeof meterReading> }) {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <Text variant="bodyMedium">Energy delivered</Text>
      <Text variant="displaySmall" style={{ color: theme.colors.tertiary, fontVariant: ['tabular-nums'] }}>
        {formatKwh(reading.kwh)}
      </Text>
      <Text variant="headlineSmall" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCredits(reading.cost)}
      </Text>
      <ProgressBar
        progress={reading.progress}
        color={reading.progress > 0.9 ? theme.colors.error : theme.colors.primary}
        style={styles.progress}
      />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {formatDuration(reading.simulatedSeconds)} simulated · Limit {formatCredits(session.spendingLimit)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, alignItems: 'center', paddingVertical: spacing.xxl },
  progress: { alignSelf: 'stretch' },
});
