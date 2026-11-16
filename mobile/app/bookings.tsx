import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton, ConfirmDialog, DateTile, ErrorView, LoadingView, Screen, useSnackbar } from '@/components';
import { useCancelBooking, useMyBookings } from '@/features/bookings/hooks';
import { addDays, colomboDateString, formatDay } from '@/features/bookings/slots';
import { errorMessage } from '@/lib/errors';
import { formatClock } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { BookingStatus, BookingWithNames } from '@/types/domain';

const MINUTE = 60 * 1000;

function canScanNow(booking: BookingWithNames): boolean {
  return booking.status === 'booked' && Date.now() >= new Date(booking.startAt).getTime() - 5 * MINUTE;
}

// "Today", "Tomorrow" or "Wed, Nov 18" in Colombo time.
function dayLabel(iso: string): string {
  const day = colomboDateString(new Date(iso));
  const today = colomboDateString(new Date());
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return formatDay(day);
}

const PAST_STATUS: Record<Exclude<BookingStatus, 'booked'>, { text: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  used: { text: 'Charged', icon: 'check-circle' },
  cancelled: { text: 'Cancelled', icon: 'close-circle' },
  expired: { text: 'Missed', icon: 'clock-alert-outline' },
};

export default function MyBookingsScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const bookings = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [toCancel, setToCancel] = useState<BookingWithNames | null>(null);

  const { upcoming, past } = useMemo(() => {
    const items = bookings.data ?? [];
    return {
      upcoming: items.filter((booking) => booking.status === 'booked').sort((a, b) => a.startAt.localeCompare(b.startAt)),
      past: items.filter((booking) => booking.status !== 'booked'),
    };
  }, [bookings.data]);

  async function confirmCancel() {
    if (!toCancel) return;
    try {
      await cancelBooking.mutateAsync(toCancel.id);
      snackbar.show('Booking cancelled');
    } catch (error) {
      snackbar.show(errorMessage(error));
    } finally {
      setToCancel(null);
    }
  }

  if (bookings.isLoading) return <LoadingView />;
  if (bookings.isError) return <ErrorView error={bookings.error} onRetry={() => bookings.refetch()} />;

  return (
    <Screen scroll title="My bookings" back refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()}>
      <View style={styles.content}>
        <Text variant="titleSmall" style={[styles.section, { color: theme.colors.onSurfaceVariant }]}>
          Upcoming
        </Text>
        {upcoming.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={theme.colors.onSurfaceVariant} />
            <View style={styles.flex}>
              <Text variant="titleSmall">No upcoming booking</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Pick a station on the map and tap Book.
              </Text>
            </View>
            <Button mode="contained-tonal" compact onPress={() => router.push('/(customer)/map')}>
              Find a charger
            </Button>
          </View>
        ) : (
          upcoming.map((booking) => (
            <UpcomingCard key={booking.id} booking={booking} onCancel={() => setToCancel(booking)} />
          ))
        )}

        {past.length > 0 ? (
          <>
            <Text variant="titleSmall" style={[styles.section, styles.pastTitle, { color: theme.colors.onSurfaceVariant }]}>
              Past
            </Text>
            <View style={[styles.list, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              {past.map((booking, index) => {
                const status = PAST_STATUS[booking.status as Exclude<BookingStatus, 'booked'>];
                const color =
                  booking.status === 'used'
                    ? theme.colors.primary
                    : booking.status === 'cancelled'
                      ? theme.colors.error
                      : theme.colors.tertiary;
                return (
                  <View
                    key={booking.id}
                    style={[
                      styles.row,
                      index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant } : null,
                    ]}
                  >
                    <DateTile iso={booking.startAt} />
                    <View style={styles.flex}>
                      <Text variant="titleSmall" numberOfLines={1}>
                        {booking.stationName}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        {booking.chargerLabel} · {formatClock(booking.startAt)} – {formatClock(booking.endAt)}
                      </Text>
                    </View>
                    {status ? (
                      <View style={styles.status}>
                        <MaterialCommunityIcons name={status.icon} size={14} color={color} />
                        <Text variant="labelMedium" style={{ color }}>
                          {status.text}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      <ConfirmDialog
        visible={!!toCancel}
        title="Cancel booking?"
        message="This frees the slot for other customers immediately."
        confirmLabel="Cancel booking"
        danger
        onConfirm={() => void confirmCancel()}
        onDismiss={() => setToCancel(null)}
      />
    </Screen>
  );
}

function UpcomingCard({ booking, onCancel }: { booking: BookingWithNames; onCancel: () => void }) {
  const theme = useAppTheme();
  const start = new Date(booking.startAt).getTime();
  const scanFrom = new Date(start - 5 * MINUTE).toISOString();
  const scanBy = new Date(start + 15 * MINUTE).toISOString();
  const scanNow = canScanNow(booking);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
      <View style={styles.cardTop}>
        <DateTile iso={booking.startAt} tone="accent" size="large" />
        <View style={styles.flex}>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            {dayLabel(booking.startAt)}
          </Text>
          <Text variant="titleLarge" style={styles.tabular}>
            {formatClock(booking.startAt)} – {formatClock(booking.endAt)}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {booking.stationName} · {booking.chargerLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name="qrcode-scan" size={18} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
          {scanNow
            ? `Scan the QR on ${booking.chargerLabel} to start. Your booking is held until ${formatClock(scanBy)}.`
            : `Scan the QR on ${booking.chargerLabel} between ${formatClock(scanFrom)} and ${formatClock(scanBy)}, or the booking is cancelled.`}
        </Text>
      </View>

      <View style={styles.actions}>
        {scanNow ? (
          <AppButton label="Scan QR to start" icon="qrcode-scan" onPress={() => router.push('/scan')} style={styles.flex} />
        ) : null}
        <Button mode="outlined" textColor={theme.colors.error} onPress={onCancel} style={scanNow ? undefined : styles.flex}>
          Cancel booking
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  section: { marginLeft: spacing.xs },
  pastTitle: { marginTop: spacing.lg },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: spacing.md },
  card: { borderWidth: 1.5, borderRadius: 18, padding: spacing.md, gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tabular: { fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 12, padding: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  list: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
