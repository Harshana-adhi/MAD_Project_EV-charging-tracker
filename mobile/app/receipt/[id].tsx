import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { AppButton, Card, ErrorView, LoadingView, Screen, StatusBadge } from '@/components';
import { useSession } from '@/features/session/hooks';
import { SPEED } from '@/features/session/meterReading';
import { formatCredits, formatDate, formatDuration, formatKwh } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';

function Row({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg }}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodyMedium" style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const session = useSession(id ?? '');

  if (session.isPending) return <Screen><LoadingView message="Loading receipt" /></Screen>;
  if (session.isError) return <Screen><ErrorView error={session.error} onRetry={() => session.refetch()} /></Screen>;

  const item = session.data;
  const cancelled = item.status === 'cancelled';
  const cost = item.cost ?? 0;
  // The demo meter runs SPEED times faster than real time, so the charging time is the real
  // elapsed time scaled the same way as the energy – otherwise it would always show 0m.
  const duration = item.endedAt
    ? Math.max(0, ((Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 1000) * SPEED)
    : 0;
  return (
    <Screen title={cancelled ? 'Session cancelled' : 'Charging receipt'} scroll>
      <View style={{ gap: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <MaterialCommunityIcons name={cancelled ? 'close-circle' : 'check-circle'} size={56} color={cancelled ? theme.colors.error : theme.colors.primary} />
          <StatusBadge status={item.status} />
          <Text variant="headlineSmall" style={{ fontVariant: ['tabular-nums'] }}>
            {formatCredits(cost)}
          </Text>
        </View>
        <Card title={item.stationName} subtitle={item.chargerLabel}>
          <View style={{ gap: spacing.md }}>
            <Row label="Connector" value={item.connector} />
            <Row label="Started" value={formatDate(item.startedAt)} />
            {item.endedAt ? <Row label="Ended" value={formatDate(item.endedAt)} /> : null}
            <Row label="Duration" value={formatDuration(duration)} />
            <Row label="Energy" value={formatKwh(item.kwh ?? 0)} />
            <Row label="Rate" value={`${formatCredits(item.ratePerKwh)} / kWh`} />
            <Row label="Spending limit" value={formatCredits(item.spendingLimit)} />
            <Row label="Credits released" value={formatCredits(item.spendingLimit - cost)} />
          </View>
        </Card>
        {!cancelled ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MaterialCommunityIcons name="leaf" size={20} color={theme.colors.primary} />
            <Text variant="bodyMedium">About {((item.kwh ?? 0) * 0.5).toFixed(1)} kg CO₂ saved vs petrol</Text>
          </View>
        ) : null}
        {item.status === 'completed' && !item.hasReview ? (
          <AppButton label="Rate this station" mode="contained-tonal" onPress={() =>
            router.push({ pathname: '/review/new', params: { stationId: item.stationId, sessionId: item.id } })
          } />
        ) : null}
        <AppButton label="Done" onPress={() => router.replace('/(customer)/map')} />
      </View>
    </Screen>
  );
}
