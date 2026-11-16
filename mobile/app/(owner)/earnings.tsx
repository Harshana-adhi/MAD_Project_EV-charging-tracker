import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, SegmentedButtons, Text } from 'react-native-paper';
import { Card, EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { EarningsChart, useOwnerEarnings, useStationEarnings } from '@/features/owner';
import { formatClock, formatCredits } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';

function colomboToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function daysBefore(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
}

export default function EarningsScreen() {
  const theme = useAppTheme();
  const [range, setRange] = useState<'1' | '7' | '30'>('7');
  const [openStationId, setOpenStationId] = useState<string | null>(null);
  const today = colomboToday();
  const from = daysBefore(today, Number(range) - 1);
  const earnings = useOwnerEarnings(from, today);
  const stationEarnings = useStationEarnings(from, today);
  const totals = useMemo(
    () =>
      (earnings.data ?? []).reduce(
        (sum, day) => ({
          earnings: sum.earnings + day.earnings,
          commission: sum.commission + day.commission,
          sessions: sum.sessions + day.sessions,
        }),
        { earnings: 0, commission: 0, sessions: 0 },
      ),
    [earnings.data],
  );

  return (
    <Screen
      scroll
      refreshing={earnings.isRefetching || stationEarnings.isRefetching}
      onRefresh={() => {
        void earnings.refetch();
        void stationEarnings.refetch();
      }}
    >
      <View style={styles.content}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Owner earnings come from completed charging sessions and the shared credit ledger.
        </Text>
        <SegmentedButtons
          value={range}
          onValueChange={(value) => setRange(value as '1' | '7' | '30')}
          buttons={[
            { value: '1', label: 'Today' },
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
          ]}
        />

        {earnings.isLoading ? <LoadingView message="Loading earnings…" /> : null}
        {earnings.isError ? <ErrorView error={earnings.error} onRetry={() => void earnings.refetch()} /> : null}
        {earnings.data && earnings.data.length === 0 ? (
          <EmptyState icon="chart-bar" title="No earnings yet" message="Completed charging earnings will appear here." />
        ) : null}
        {earnings.data && earnings.data.length > 0 ? (
          <>
            {totals.sessions === 0 && totals.earnings === 0 ? (
              <EmptyState icon="chart-bar" title="No earnings in this period" message="Ledger earnings and completed session totals will appear here when you have charging activity." />
            ) : null}
            <View style={styles.metrics}>
              <Card title="Owner earnings">
                <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontVariant: ['tabular-nums'] }}>
                  {formatCredits(totals.earnings)}
                </Text>
              </Card>
              <Card title="Platform commission">
                <Text variant="headlineSmall" style={{ color: theme.colors.secondary, fontVariant: ['tabular-nums'] }}>
                  {formatCredits(totals.commission)}
                </Text>
              </Card>
              <Card title="Completed sessions">
                <Text variant="headlineSmall" style={{ fontVariant: ['tabular-nums'] }}>{totals.sessions}</Text>
              </Card>
            </View>
            <Card title="Earnings by station">
              {stationEarnings.isLoading ? <LoadingView message="Loading stations…" /> : null}
              {stationEarnings.data?.length === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>No stations yet.</Text>
              ) : null}
              {stationEarnings.data?.map((station) => (
                <View key={station.stationId}>
                  <List.Accordion
                    title={station.stationName}
                    description={`${station.sessions} ${station.sessions === 1 ? 'session' : 'sessions'} · ${formatCredits(station.earnings)} earned · ${formatCredits(station.commission)} commission`}
                    expanded={openStationId === station.stationId}
                    onPress={() => setOpenStationId(openStationId === station.stationId ? null : station.stationId)}
                    titleNumberOfLines={2}
                    descriptionNumberOfLines={3}
                  >
                    {station.items.length === 0 ? (
                      <Text variant="bodySmall" style={[styles.emptyItems, { color: theme.colors.onSurfaceVariant }]}>
                        No sessions in this period.
                      </Text>
                    ) : (
                      station.items.map((item) => (
                        <View key={item.id} style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
                          <View style={styles.dayInfo}>
                            <Text variant="titleSmall">{item.chargerLabel}</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {new Date(item.endedAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' })}
                              {' · '}
                              {formatClock(item.endedAt)}
                            </Text>
                          </View>
                          <View style={styles.dayValues}>
                            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>{formatCredits(item.earning)}</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Commission {formatCredits(item.commission)}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </List.Accordion>
                  <Divider />
                </View>
              ))}
            </Card>
            <Card title="Daily earnings and commission">
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <EarningsChart data={earnings.data} />
              </ScrollView>
            </Card>
            <Card title="Daily breakdown">
              <View style={styles.breakdown}>
                {earnings.data.map((day) => (
                  <View key={day.day} style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
                    <View style={styles.dayInfo}>
                      <Text variant="titleSmall">{new Date(`${day.day}T12:00:00`).toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{day.sessions} sessions</Text>
                    </View>
                    <View style={styles.dayValues}>
                      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>{formatCredits(day.earnings)}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Commission {formatCredits(day.commission)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  metrics: { gap: spacing.sm },
  breakdown: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  dayInfo: { gap: spacing.xs },
  emptyItems: { padding: spacing.md },
  dayValues: { alignItems: 'flex-end', gap: spacing.xs },
});
