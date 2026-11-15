import { FlatList, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text } from 'react-native-paper';
import { AppButton, Card, EmptyState, ErrorView, LoadingView, Screen, StatusBadge } from '@/components';
import { useActiveSession, useMySessions, useSessionEvents } from '@/features/session/hooks';
import type { SessionWithNames } from '@/types/domain';
import { formatCredits, formatDate, formatKwh } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';

export default function ChargingHistoryScreen() {
  const theme = useAppTheme();
  const active = useActiveSession();
  const sessions = useMySessions();
  useSessionEvents();

  useFocusEffect(useCallback(() => {
    active.refetch();
    sessions.refetch();
  }, [active.refetch, sessions.refetch]));

  function open(item: SessionWithNames) {
    if (item.status === 'active') router.push({ pathname: '/session/[id]', params: { id: item.id } });
    else router.push({ pathname: '/receipt/[id]', params: { id: item.id } });
  }

  if (sessions.isPending || active.isPending) return <Screen><LoadingView message="Loading sessions" /></Screen>;
  if (sessions.isError) return <Screen><ErrorView error={sessions.error} onRetry={() => sessions.refetch()} /></Screen>;
  if (active.isError) return <Screen><ErrorView error={active.error} onRetry={() => active.refetch()} /></Screen>;

  return (
    <Screen>
      <FlatList
        data={sessions.data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshing={sessions.isRefetching || active.isRefetching}
        onRefresh={() => { sessions.refetch(); active.refetch(); }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            {active.data ? (
              <Card title="Charging in progress" subtitle={active.data.stationName} onPress={() => open(active.data!)}>
                <Text variant="bodyMedium">Tap to resume your session</Text>
              </Card>
            ) : null}
            <Text variant="headlineSmall">Charging history</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="No charging sessions yet"
            message="Find a charger on the map to get started."
            actionLabel="Open map"
            onAction={() => router.push('/(customer)/map')}
          />
        }
        renderItem={({ item }) => (
          <Card title={item.stationName} subtitle={formatDate(item.startedAt)} right={<StatusBadge status={item.status} />} onPress={() => open(item)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.chargerLabel} · {item.kwh === null ? 'In progress' : formatKwh(item.kwh)}
              </Text>
              <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                {item.cost === null ? '—' : formatCredits(item.cost)}
              </Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
