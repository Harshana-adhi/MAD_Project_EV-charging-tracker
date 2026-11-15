import { router } from 'expo-router';
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
import { useOwnerEarnings, useOwnerSessions, useOwnerStations, useSetChargerStatus } from '@/features/owner';
import { useMyWallet } from '@/features/wallet/hooks';
import { formatCredits } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { spacing, useAppTheme } from '@/lib/theme';
import type { ChargerStatus, StationStatus } from '@/types/domain';

const STATION_STATUSES: StationStatus[] = ['approved', 'pending', 'rejected'];
const CHARGER_STATUSES: ChargerStatus[] = ['available', 'busy', 'offline'];

export default function OwnerDashboardScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { width } = useWindowDimensions();
  const stations = useOwnerStations();
  const wallet = useMyWallet();
  const sessions = useOwnerSessions();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const earnings = useOwnerEarnings(today, today);
  const setStatus = useSetChargerStatus();
  const stationData = stations.data;
  const chargers = stationData?.flatMap((station) => station.chargers) ?? [];
  const metricWidth = width >= 700 ? '32%' : '48%';

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
    try {
      await setStatus.mutateAsync({ id: chargerId, status: status === 'available' ? 'offline' : 'available' });
      snackbar.show(`Charger marked ${status === 'available' ? 'offline' : 'available'}`);
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
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

        {stations.isLoading && wallet.isLoading ? (
          <LoadingView message="Loading your dashboard…" />
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
        {wallet.isLoading && !wallet.data ? (
          <LoadingView message="Loading wallet…" />
        ) : null}
        {wallet.isError ? <ErrorView error={wallet.error} onRetry={() => void wallet.refetch()} /> : null}

        <View style={styles.metrics}>
          <View style={[styles.metricCell, { flexBasis: metricWidth }]}>
            <MetricCard
              title="Today's earnings"
              value={todaysEarnings === undefined ? '—' : formatCredits(todaysEarnings)}
              detail={todaysEarnings === undefined ? 'Earnings data unavailable' : 'From the owner earning ledger'}
              icon="chart-bar"
            />
          </View>
          <View style={[styles.metricCell, { flexBasis: metricWidth }]}>
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
                    description={`${charger.connector} · ${charger.powerKw} kW · ${charger.status}`}
                    left={(props) => <List.Icon {...props} icon={charger.status === 'offline' ? 'power-plug-off' : charger.status === 'busy' ? 'lightning-bolt' : 'power-plug'} />}
                    right={() => charger.status === 'busy' ? null : (
                      <IconButton
                        icon={charger.status === 'available' ? 'power-plug-off' : 'power-plug'}
                        accessibilityLabel={charger.status === 'available' ? 'Set offline' : 'Set available'}
                        onPress={() => void toggleCharger(charger.id, charger.status)}
                        disabled={setStatus.isPending}
                      />
                    )}
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
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCell: { flexGrow: 1, flexShrink: 1 },
  metricValue: { fontVariant: ['tabular-nums'], marginBottom: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flexGrow: 1 },
});
