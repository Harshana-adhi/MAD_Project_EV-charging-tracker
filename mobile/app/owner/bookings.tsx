import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { useOwnerBookingHistory, useOwnerBookings } from '@/features/bookings/hooks';
import { bookingDayLabel, bookingLength, bookingTimeRange } from '@/features/bookings/ownerBookings';
import { formatCredits, formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { BookingStatus, OwnerBookingHistoryItem, OwnerBookingWithNames } from '@/types/domain';

type Tab = 'upcoming' | 'history';
type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function colomboHour(iso: string): number {
  return Number(new Date(iso).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Colombo' })) % 24;
}

function colomboWeekday(iso: string): number {
  const name = new Date(iso).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Colombo' });
  return WEEKDAYS.indexOf(name);
}

const hourText = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;

function groupByDay<T extends { startAt: string }>(items: T[]) {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = bookingDayLabel(item.startAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

// Everything an owner wants to know about bookings on their chargers: what's coming up, and how
// the last 30 days went, in plain words.
export default function OwnerBookingsScreen() {
  const theme = useAppTheme();
  const bookings = useOwnerBookings();
  const history = useOwnerBookingHistory();
  const [tab, setTab] = useState<Tab>('upcoming');

  const upcoming = (bookings.data ?? []).filter((booking) => new Date(booking.endAt).getTime() > Date.now());
  const past = useMemo(() => history.data ?? [], [history.data]);
  const summary = useMemo(() => summarise(past), [past]);

  function refresh() {
    void bookings.refetch();
    void history.refetch();
  }

  return (
    <Screen title="Bookings" back scroll refreshing={bookings.isRefetching || history.isRefetching} onRefresh={refresh}>
      <View style={styles.content}>
        {history.isLoading ? <LoadingView message="Loading the last 30 days…" /> : null}
        {history.isError ? <ErrorView error={history.error} onRetry={() => void history.refetch()} /> : null}
        {history.isSuccess ? <SummaryCard summary={summary} upcomingCount={upcoming.length} /> : null}

        <SegmentedButtons
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
          buttons={[
            { value: 'upcoming', label: `Upcoming${bookings.isSuccess ? ` (${upcoming.length})` : ''}`, icon: 'calendar-clock' },
            { value: 'history', label: `Last 30 days${history.isSuccess ? ` (${past.length})` : ''}`, icon: 'history' },
          ]}
        />

        {tab === 'upcoming' ? (
          <>
            <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="qrcode-scan" size={18} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
                Customers must scan the charger's QR within 15 minutes of the start time, or the booking is cancelled
                and the charger is free again.
              </Text>
            </View>
            {bookings.isLoading ? <LoadingView message="Loading bookings…" /> : null}
            {bookings.isError ? <ErrorView error={bookings.error} onRetry={() => void bookings.refetch()} /> : null}
            {bookings.isSuccess && upcoming.length === 0 ? (
              <EmptyState
                icon="calendar-blank-outline"
                title="No upcoming bookings"
                message="When a customer books one of your chargers, it shows up here."
              />
            ) : null}
            {groupByDay(upcoming).map((group) => (
              <View key={group.day} style={styles.group}>
                <Text variant="titleMedium">
                  {group.day} · {group.items.length} booking{group.items.length > 1 ? 's' : ''}
                </Text>
                {group.items.map((booking) => (
                  <UpcomingCard key={booking.id} booking={booking} />
                ))}
              </View>
            ))}
          </>
        ) : (
          <>
            {history.isSuccess && past.length === 0 ? (
              <EmptyState
                icon="history"
                title="No bookings in the last 30 days"
                message="Past bookings, and whether the customer turned up, show here."
              />
            ) : null}
            {groupByDay(past).map((group) => (
              <View key={group.day} style={styles.group}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {group.day}
                </Text>
                <View style={[styles.list, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                  {group.items.map((booking, index) => (
                    <HistoryRow key={booking.id} booking={booking} first={index === 0} />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}

type Summary = {
  total: number;
  charged: number;
  missed: number;
  cancelled: number;
  showUp: number | null;
  earned: number;
  kwh: number;
  busiestCharger: { label: string; station: string; count: number } | null;
  busiestHour: number | null;
  busiestDay: string | null;
};

function summarise(items: OwnerBookingHistoryItem[]): Summary {
  const count = (status: BookingStatus) => items.filter((item) => item.status === status).length;
  const charged = count('used');
  const missed = count('expired');
  const cancelled = count('cancelled');

  const byCharger = new Map<string, { label: string; station: string; count: number }>();
  const byHour = new Array(24).fill(0) as number[];
  const byDay = new Array(7).fill(0) as number[];
  for (const item of items) {
    const key = item.chargerId;
    const entry = byCharger.get(key) ?? { label: item.chargerLabel, station: item.stationName, count: 0 };
    entry.count += 1;
    byCharger.set(key, entry);
    byHour[colomboHour(item.startAt)] += 1;
    const weekday = colomboWeekday(item.startAt);
    if (weekday >= 0) byDay[weekday] += 1;
  }
  const busiestCharger = [...byCharger.values()].sort((a, b) => b.count - a.count)[0] ?? null;
  // The hour most bookings start in.
  const topHour = Math.max(...byHour);
  const busiestHour = topHour > 0 ? byHour.indexOf(topHour) : null;
  const topDay = Math.max(...byDay);
  const busiestDay = topDay > 0 ? WEEKDAYS[byDay.indexOf(topDay)] : null;

  return {
    total: items.length,
    charged,
    missed,
    cancelled,
    showUp: charged + missed > 0 ? Math.round((charged / (charged + missed)) * 100) : null,
    earned: items.reduce((sum, item) => sum + (item.earned ?? 0), 0),
    kwh: items.reduce((sum, item) => sum + (item.kwh ?? 0), 0),
    busiestCharger,
    busiestHour,
    busiestDay,
  };
}

function SummaryCard({ summary, upcomingCount }: { summary: Summary; upcomingCount: number }) {
  const theme = useAppTheme();
  const insights: { icon: Icon; text: string }[] = [];
  if (summary.earned > 0) {
    insights.push({
      icon: 'cash',
      text: `You earned ${formatCredits(summary.earned)} from booked charging (${summary.kwh.toFixed(1)} kWh).`,
    });
  }
  if (summary.busiestCharger && summary.total > 1) {
    insights.push({
      icon: 'ev-plug-type2',
      text: `${summary.busiestCharger.label} at ${summary.busiestCharger.station} is booked the most (${summary.busiestCharger.count} times).`,
    });
  }
  if (summary.busiestHour !== null && summary.total > 1) {
    insights.push({
      icon: 'clock-outline',
      text: `Most bookings start around ${hourText(summary.busiestHour)}.`,
    });
  }
  if (summary.busiestDay && summary.total > 2) {
    insights.push({ icon: 'calendar-star', text: `${summary.busiestDay} is your busiest day.` });
  }

  return (
    <View style={[styles.summary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.summaryTop}>
        <View style={styles.flex}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Last 30 days
          </Text>
          <Text variant="displaySmall" style={styles.total}>
            {summary.total}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            booking{summary.total === 1 ? '' : 's'} · {upcomingCount} still to come
          </Text>
        </View>
        <View style={[styles.bigIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="calendar-check" size={30} color={theme.colors.onPrimaryContainer} />
        </View>
      </View>

      <View style={styles.counts}>
        <Count label="Charged" value={summary.charged} color={theme.colors.primary} icon="check-circle" />
        <Count label="Missed" value={summary.missed} color={theme.colors.tertiary} icon="clock-alert-outline" />
        <Count label="Cancelled" value={summary.cancelled} color={theme.colors.error} icon="close-circle" />
      </View>

      {summary.showUp !== null ? (
        <View style={styles.showUp}>
          <View style={styles.showUpText}>
            <Text variant="bodyMedium">Customers who turned up</Text>
            <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
              {summary.showUp}%
            </Text>
          </View>
          <View style={[styles.bar, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={[styles.barFill, { width: `${summary.showUp}%`, backgroundColor: theme.colors.primary }]} />
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {summary.charged} of {summary.charged + summary.missed} customers came and charged. Cancellations aren't counted.
          </Text>
        </View>
      ) : null}

      {insights.length > 0 ? (
        <View style={[styles.insights, { borderTopColor: theme.colors.outlineVariant }]}>
          {insights.map((insight) => (
            <View key={insight.text} style={styles.insight}>
              <MaterialCommunityIcons name={insight.icon} size={18} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={styles.flex}>
                {insight.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Count({ label, value, color, icon }: { label: string; value: number; color: string; icon: Icon }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.count, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.countTop}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text variant="titleLarge" style={styles.tabular}>
          {value}
        </Text>
      </View>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const HISTORY_STATUS: Record<BookingStatus, { text: string; icon: Icon }> = {
  used: { text: 'Charged', icon: 'check-circle' },
  expired: { text: 'Missed', icon: 'clock-alert-outline' },
  cancelled: { text: 'Cancelled', icon: 'close-circle' },
  booked: { text: 'In progress', icon: 'progress-clock' },
};

function HistoryRow({ booking, first }: { booking: OwnerBookingHistoryItem; first: boolean }) {
  const theme = useAppTheme();
  const status = HISTORY_STATUS[booking.status];
  const color =
    booking.status === 'used'
      ? theme.colors.primary
      : booking.status === 'cancelled'
        ? theme.colors.error
        : booking.status === 'expired'
          ? theme.colors.tertiary
          : theme.colors.onSurfaceVariant;
  return (
    <View
      style={[styles.row, !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant } : null]}
    >
      <View style={styles.flex}>
        <Text variant="titleSmall">{bookingTimeRange(booking.startAt, booking.endAt)}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {booking.customerName} · {booking.chargerLabel} · {booking.stationName}
        </Text>
      </View>
      <View style={styles.rowEnd}>
        <View style={styles.status}>
          <MaterialCommunityIcons name={status.icon} size={14} color={color} />
          <Text variant="labelMedium" style={{ color }}>
            {status.text}
          </Text>
        </View>
        {booking.earned !== null ? (
          <Text variant="labelMedium" style={styles.tabular}>
            {formatCredits(booking.earned)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function UpcomingCard({ booking }: { booking: OwnerBookingWithNames }) {
  const theme = useAppTheme();
  const startsIn = Math.round((new Date(booking.startAt).getTime() - Date.now()) / 60000);
  const happeningNow = startsIn <= 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <Text variant="titleMedium">{bookingTimeRange(booking.startAt, booking.endAt)}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {bookingDayLabel(booking.startAt)} · {bookingLength(booking.startAt, booking.endAt)}
          </Text>
        </View>
        <View
          style={[styles.badge, { backgroundColor: happeningNow ? theme.colors.tertiaryContainer : theme.colors.primaryContainer }]}
        >
          <Text variant="labelMedium" style={{ color: happeningNow ? theme.colors.onTertiaryContainer : theme.colors.onPrimaryContainer }}>
            {happeningNow ? 'Now' : startsIn < 60 ? `In ${startsIn} min` : 'Booked'}
          </Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
      <Detail icon="account-outline" label="Customer" value={booking.customerName} />
      <Detail icon="ev-station" label="Station" value={booking.stationName} />
      <Detail icon="ev-plug-type2" label="Charger" value={booking.chargerLabel} />
      <Detail icon="calendar-check-outline" label="Booked on" value={formatDate(booking.createdAt)} />
      <Detail icon="pound" label="Reference" value={booking.id.slice(0, 8).toUpperCase()} />
    </View>
  );
}

function Detail({ icon, label, value }: { icon: Icon; label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detail}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.flex} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  tabular: { fontVariant: ['tabular-nums'] },
  summary: { borderWidth: 1, borderRadius: 18, padding: spacing.md, gap: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  total: { fontVariant: ['tabular-nums'], fontWeight: '700' },
  bigIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  counts: { flexDirection: 'row', gap: spacing.sm },
  count: { flex: 1, borderRadius: 12, padding: spacing.sm, gap: 2 },
  countTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  showUp: { gap: spacing.xs },
  showUpText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  insights: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 12, padding: spacing.sm },
  group: { gap: spacing.sm },
  list: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  rowEnd: { alignItems: 'flex-end', gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel: { width: 86 },
});
