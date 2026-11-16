import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWindowDimensions, View, StyleSheet } from 'react-native';
import { Card as PaperCard, IconButton, List, Text } from 'react-native-paper';
import {
  AppButton,
  Card,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  StatusBadge,
  useSnackbar,
} from '@/components';
import { useOwnerEarnings, useOwnerSessions, useOwnerStations, useOwnerWallet, useSetChargerStatus, WalkinDialog } from '@/features/owner';
import { formatClock, formatCredits } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { spacing, useAppTheme } from '@/lib/theme';
import type { Charger, ChargerStatus, StationStatus } from '@/types/domain';

const STATION_STATUSES: StationStatus[] = ['approved', 'pending', 'rejected'];
const CHARGER_STATUSES: ChargerStatus[] = ['available', 'busy', 'offline', 'walkin'];

export default function OwnerDashboardScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { fontScale } = useWindowDimensions();
  const [metricsWidth, setMetricsWidth] = useState(0);
  const stations = useOwnerStations();
  const wallet = useOwnerWallet();
  const sessions = useOwnerSessions();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const earnings = useOwnerEarnings(today, today);
  const setStatus = useSetChargerStatus();
  const [walkinCharger, setWalkinCharger] = useState<Charger | null>(null);
  const stationData = stations.data;
  const chargers = stationData?.flatMap((station) => station.chargers) ?? [];
  const minimumMetricWidth = 180 * fontScale;
  const stackMetrics =
    metricsWidth === 0 || metricsWidth < minimumMetricWidth * 2 + spacing.md;
  const metricCellWidth = metricsWidth > 0
    ? stackMetrics ? metricsWidth : (metricsWidth - spacing.md) / 2
    : '100%';

  function refreshDashboard() {
    void Promise.all([stations.refetch(), wallet.refetch(), sessions.refetch(), earnings.refetch()]);
  }

  function countStationStatus(status: StationStatus): number {
    return stationData?.filter((station) => station.status === status).length ?? 0;
  }

  function countChargerStatus(status: ChargerStatus): number {
    return chargers.filter((charger) => charger.status === status).length;
  }

  const activeSessionCount = sessions.data?.filter((session) => session.status === 'active').length ?? null;
  const todaysEarnings = earnings.data?.find((day) => day.day === today)?.earnings;

  async function toggleCharger(chargerId: string, status: ChargerStatus) {
    if (status === 'busy') {
      snackbar.show('Busy chargers cannot be changed');
      return;
    }
    const next = status === 'offline' ? 'available' : 'offline';
    try {
      await setStatus.mutateAsync({ id: chargerId, status: next });
      snackbar.show(`Charger marked ${next}`);
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
  }

  async function releaseCharger(chargerId: string) {
    try {
      await setStatus.mutateAsync({ id: chargerId, status: 'available' });
      snackbar.show('Charger released');
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
  }

  async function submitWalkin(busyUntil?: string) {
    if (!walkinCharger) return;
    await setStatus.mutateAsync({ id: walkinCharger.id, status: 'walkin', busyUntil });
    setWalkinCharger(null);
    snackbar.show('Charger marked as busy');
  }

  return (
    <Screen
      scroll
      refreshing={stations.isRefetching || wallet.isRefetching || sessions.isRefetching || earnings.isRefetching}
      onRefresh={refreshDashboard}
    >
      <View style={styles.content}>
        <View style={styles.greeting}>
          <Text variant="headlineSmall">Today at a glance</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Your stations, chargers and wallet summary.
          </Text>
        </View>

        {stations.isLoading || wallet.isLoading ? (
          <LoadingView message="Loading dashboard data…" />
        ) : null}
        {earnings.isLoading || sessions.isLoading ? <LoadingView message="Loading session and earnings totals…" /> : null}

        {wallet.data ? (
          <PaperCard
            mode="elevated"
            onPress={() => router.push('/owner/wallet')}
            style={[styles.walletCard, { backgroundColor: theme.colors.primaryContainer }]}
          >
            <PaperCard.Content style={styles.walletContent}>
              <View style={styles.walletHeading}>
                <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  Available balance
                </Text>
                <MaterialCommunityIcons name="wallet-outline" size={24} color={theme.colors.onPrimaryContainer} />
              </View>
              <Text variant="displaySmall" style={[styles.balance, { color: theme.colors.onPrimaryContainer }]}>
                {formatCredits(wallet.data.available)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                Balance {formatCredits(wallet.data.balance)} · Held {formatCredits(wallet.data.held)}
              </Text>
              <Text variant="labelLarge" style={{ color: theme.colors.primary, marginTop: spacing.xs }}>
                View wallet
              </Text>
            </PaperCard.Content>
          </PaperCard>
        ) : null}
        {wallet.isError ? <ErrorView error={wallet.error} onRetry={() => void wallet.refetch()} /> : null}

        <View
          style={styles.metrics}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setMetricsWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
          }}
        >
          <View style={[styles.metricCell, { width: metricCellWidth }]}>
            <MetricCard
              title="Today's earnings"
              value={todaysEarnings === undefined ? '—' : formatCredits(todaysEarnings)}
              detail={todaysEarnings === undefined ? 'Earnings data unavailable' : 'From the owner earning ledger'}
              icon="chart-bar"
            />
          </View>
          <View style={[styles.metricCell, { width: metricCellWidth }]}>
            <MetricCard
              title="Active sessions"
              value={activeSessionCount === null ? '—' : String(activeSessionCount)}
              detail={activeSessionCount === null ? 'Session data unavailable' : 'Live session records'}
              icon="lightning-bolt"
            />
          </View>
        </View>

        {earnings.isError ? <ErrorView error={earnings.error} onRetry={() => void earnings.refetch()} /> : null}
        {sessions.isError ? <ErrorView error={sessions.error} onRetry={() => void sessions.refetch()} /> : null}

        {stations.isError ? <ErrorView error={stations.error} onRetry={() => void stations.refetch()} /> : null}
        {stations.data ? (
          <>
            {stations.data.length === 0 ? (
              <EmptyState
                icon="ev-station"
                title="No stations yet"
                message="Add your first station to start setting up your charging point."
                actionLabel="Add station"
                onAction={() => router.push('/owner/station/new')}
              />
            ) : (
              <Card
                title={`Stations · ${stations.data.length}`}
                right={
                  <MaterialCommunityIcons
                    name="ev-station"
                    size={24}
                    color={theme.colors.primary}
                  />
                }
              >
                <View style={styles.badges}>
                  {STATION_STATUSES.map((status) => (
                    <StatusBadge key={status} status={status} count={String(countStationStatus(status))} />
                  ))}
                </View>
              </Card>
            )}
            <Card
              title="Charger availability"
              subtitle={`${chargers.length} ${chargers.length === 1 ? 'charger' : 'chargers'} across your stations`}
              right={
                <MaterialCommunityIcons
                  name="ev-plug-type2"
                  size={24}
                  color={theme.colors.primary}
                />
              }
            >
              <View style={styles.badges}>
                {CHARGER_STATUSES.map((status) => (
                  <StatusBadge key={status} status={status} count={String(countChargerStatus(status))} />
                ))}
              </View>
            </Card>
            <Card title="Charger controls" subtitle="Busy chargers are controlled by the active charging session">
              {chargers.length === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Add a charger from one of your stations to manage availability.</Text>
              ) : (
                chargers.map((charger) => (
                  <List.Item
                    key={charger.id}
                    title={charger.label}
                    description={
                      charger.status === 'walkin'
                        ? `${charger.connector} · ${charger.powerKw} kW · marked busy${charger.busyUntil ? ` until ${formatClock(charger.busyUntil)}` : ''}`
                        : `${charger.connector} · ${charger.powerKw} kW · ${charger.status}`
                    }
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={
                          charger.status === 'offline'
                            ? 'power-plug-off'
                            : charger.status === 'busy' || charger.status === 'walkin'
                              ? 'lightning-bolt'
                              : 'power-plug'
                        }
                      />
                    )}
                    right={() =>
                      charger.status === 'busy' ? null : (
                        <View style={styles.chargerRowActions}>
                          {charger.status === 'walkin' ? (
                            <IconButton
                              icon="lock-open-outline"
                              accessibilityLabel="Release"
                              onPress={() => void releaseCharger(charger.id)}
                              disabled={setStatus.isPending}
                            />
                          ) : charger.status === 'available' ? (
                            <IconButton
                              icon="account-clock-outline"
                              accessibilityLabel="Mark as busy"
                              onPress={() => setWalkinCharger(charger)}
                              disabled={setStatus.isPending}
                            />
                          ) : null}
                          <IconButton
                            icon={charger.status === 'offline' ? 'power-plug' : 'power-plug-off'}
                            accessibilityLabel={charger.status === 'offline' ? 'Set available' : 'Set offline'}
                            onPress={() => void toggleCharger(charger.id, charger.status)}
                            disabled={setStatus.isPending}
                          />
                        </View>
                      )
                    }
                  />
                ))
              )}
            </Card>
          </>
        ) : null}

        <Card title="Quick actions">
          <View style={styles.actions}>
            <AppButton
              label="Add station"
              icon="plus"
              onPress={() => router.push('/owner/station/new')}
              style={styles.actionButton}
            />
            <AppButton
              label="My stations"
              icon="ev-station"
              mode="contained-tonal"
              onPress={() => router.push('/(owner)/stations')}
              style={styles.actionButton}
            />
            <AppButton
              label="Sessions"
              icon="lightning-bolt"
              mode="contained-tonal"
              onPress={() => router.push('/owner/sessions')}
              style={styles.actionButton}
            />
            <AppButton
              label="Earnings"
              icon="chart-bar"
              mode="contained-tonal"
              onPress={() => router.push('/(owner)/earnings')}
              style={styles.actionButton}
            />
            <AppButton
              label="Wallet"
              icon="wallet-outline"
              mode="contained-tonal"
              onPress={() => router.push('/owner/wallet')}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
      {walkinCharger ? (
        <WalkinDialog onSubmit={submitWalkin} onDismiss={() => setWalkinCharger(null)} />
      ) : null}
    </Screen>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const theme = useAppTheme();

  return (
    <Card
      title={title}
      right={<MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />}
    >
      <Text variant="headlineMedium" style={[styles.metricValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {detail}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  greeting: { gap: spacing.xs, marginBottom: spacing.xs },
  walletCard: { borderRadius: 16 },
  walletContent: { gap: spacing.sm },
  walletHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balance: { fontVariant: ['tabular-nums'] },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  metricCell: { minWidth: 0 },
  metricValue: { fontVariant: ['tabular-nums'], marginBottom: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flexGrow: 1 },
  chargerRowActions: { flexDirection: 'row', alignItems: 'center' },
});
