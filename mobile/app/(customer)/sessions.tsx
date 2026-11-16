import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateTile, EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { useMyBookings } from '@/features/bookings/hooks';
import { addDays, colomboDateString, formatDay } from '@/features/bookings/slots';
import { useActiveSession, useMySessions, useSessionEvents } from '@/features/session/hooks';
import { formatClock, formatCredits } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { SessionStatus, SessionWithNames } from '@/types/domain';

// "Today", "Tomorrow" or "Wed, Nov 18" in Colombo time.
function dayLabel(iso: string): string {
  const day = colomboDateString(new Date(iso));
  const today = colomboDateString(new Date());
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return formatDay(day);
}

const monthName = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' });

export default function ChargingHistoryScreen() {
  const theme = useAppTheme();
  const active = useActiveSession();
  const sessions = useMySessions();
  const bookings = useMyBookings();
  useSessionEvents();

  useFocusEffect(
    useCallback(() => {
      active.refetch();
      sessions.refetch();
      bookings.refetch();
    }, [active.refetch, sessions.refetch, bookings.refetch]),
  );

  function open(item: SessionWithNames) {
    if (item.status === 'active') router.push({ pathname: '/session/[id]', params: { id: item.id } });
    else router.push({ pathname: '/receipt/[id]', params: { id: item.id } });
  }

  if (sessions.isPending || active.isPending) return <Screen><LoadingView message="Loading sessions" /></Screen>;
  if (sessions.isError) return <Screen><ErrorView error={sessions.error} onRetry={() => sessions.refetch()} /></Screen>;
  if (active.isError) return <Screen><ErrorView error={active.error} onRetry={() => active.refetch()} /></Screen>;

  const history = (sessions.data ?? []).filter((item) => item.status !== 'active');
  const finished = history.filter((item) => item.status === 'completed' || item.status === 'disputed');
  const totalKwh = finished.reduce((sum, item) => sum + (item.kwh ?? 0), 0);
  const totalSpent = finished.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const nextBooking = (bookings.data ?? [])
    .filter((booking) => booking.status === 'booked')
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  const months: { name: string; items: SessionWithNames[] }[] = [];
  for (const item of history) {
    const name = monthName(item.startedAt);
    const last = months[months.length - 1];
    if (last && last.name === name) last.items.push(item);
    else months.push({ name, items: [item] });
  }

  return (
    <Screen
      scroll
      refreshing={sessions.isRefetching || active.isRefetching}
      onRefresh={() => {
        sessions.refetch();
        active.refetch();
        bookings.refetch();
      }}
    >
      <View style={styles.content}>
        {active.data ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => open(active.data!)}
            style={[styles.live, { backgroundColor: theme.colors.primary }]}
          >
            <View style={[styles.liveIcon, { backgroundColor: theme.colors.onPrimary }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="labelMedium" style={{ color: theme.colors.onPrimary, opacity: 0.85 }}>
                Charging now
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onPrimary }} numberOfLines={1}>
                {active.data.stationName}
              </Text>
            </View>
            <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
              View
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onPrimary} />
          </Pressable>
        ) : null}

        {finished.length > 0 ? (
          <View style={styles.stats}>
            <Stat label="Sessions" value={String(finished.length)} />
            <Stat label="Energy" value={`${totalKwh.toFixed(1)} kWh`} />
            <Stat label="Spent" value={`LKR ${Math.round(totalSpent).toLocaleString('en-LK')}`} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/bookings')}
          style={({ pressed }) => [
            styles.bookingRow,
            {
              backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="calendar-clock" size={22} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.flex}>
            <Text variant="titleSmall">My bookings</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {nextBooking
                ? `Next: ${dayLabel(nextBooking.startAt)}, ${formatClock(nextBooking.startAt)} · ${nextBooking.stationName}`
                : 'No upcoming booking'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </Pressable>

        {history.length === 0 ? (
          <EmptyState
            icon="history"
            title="No charging sessions yet"
            message="Find a charger on the map to get started."
            actionLabel="Open map"
            onAction={() => router.push('/(customer)/map')}
          />
        ) : (
          months.map((month) => (
            <View key={month.name} style={styles.month}>
              <Text variant="titleSmall" style={[styles.monthTitle, { color: theme.colors.onSurfaceVariant }]}>
                {month.name}
              </Text>
              <View style={[styles.list, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                {month.items.map((item, index) => (
                  <HistoryRow key={item.id} item={item} first={index === 0} onPress={() => open(item)} />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleSmall" numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

const STATUS_TEXT: Partial<Record<SessionStatus, string>> = { cancelled: 'Cancelled', disputed: 'Disputed' };

function HistoryRow({ item, first, onPress }: { item: SessionWithNames; first: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const status = STATUS_TEXT[item.status];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant } : null,
        pressed ? { backgroundColor: theme.colors.surfaceVariant } : null,
      ]}
    >
      <DateTile iso={item.startedAt} />
      <View style={styles.flex}>
        <Text variant="titleSmall" numberOfLines={1}>
          {item.stationName}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {formatClock(item.startedAt)} · {item.chargerLabel}
          {item.kwh !== null ? ` · ${item.kwh.toFixed(1)} kWh` : ''}
        </Text>
      </View>
      <View style={styles.amount}>
        <Text variant="titleSmall" style={styles.tabular}>
          {item.cost === null ? '—' : formatCredits(item.cost)}
        </Text>
        {status ? (
          <Text variant="labelSmall" style={{ color: item.status === 'cancelled' ? theme.colors.error : theme.colors.tertiary }}>
            {status}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  live: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 16, padding: spacing.md },
  liveIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderRadius: 14, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2 },
  statValue: { fontVariant: ['tabular-nums'] },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 16, borderWidth: 1, padding: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  month: { gap: spacing.sm },
  monthTitle: { marginLeft: spacing.xs },
  list: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  amount: { alignItems: 'flex-end', gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
});
