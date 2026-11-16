import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { useOwnerBookings } from '@/features/bookings/hooks';
import { bookingDayLabel, bookingLength, bookingTimeRange } from '@/features/bookings/ownerBookings';
import { formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { OwnerBookingWithNames } from '@/types/domain';

// Every upcoming booking on the owner's chargers, grouped by day, with the full details.
export default function OwnerBookingsScreen() {
  const theme = useAppTheme();
  const bookings = useOwnerBookings();
  const upcoming = (bookings.data ?? []).filter((booking) => new Date(booking.endAt).getTime() > Date.now());

  const groups: { day: string; items: OwnerBookingWithNames[] }[] = [];
  for (const booking of upcoming) {
    const day = bookingDayLabel(booking.startAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(booking);
    else groups.push({ day, items: [booking] });
  }

  return (
    <Screen title="Bookings" back scroll refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()}>
      <View style={styles.content}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Customers who booked your chargers. Each one must scan the charger's QR within 15 minutes of the start
          time, or the booking is cancelled.
        </Text>
        {bookings.isLoading ? <LoadingView message="Loading bookings…" /> : null}
        {bookings.isError ? <ErrorView error={bookings.error} onRetry={() => void bookings.refetch()} /> : null}
        {bookings.isSuccess && upcoming.length === 0 ? (
          <EmptyState
            icon="calendar-blank-outline"
            title="No upcoming bookings"
            message="When a customer books one of your chargers, it shows up here."
          />
        ) : null}
        {groups.map((group) => (
          <View key={group.day} style={styles.group}>
            <Text variant="titleMedium">
              {group.day} · {group.items.length} booking{group.items.length > 1 ? 's' : ''}
            </Text>
            {group.items.map((booking) => (
              <BookingDetails key={booking.id} booking={booking} />
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function BookingDetails({ booking }: { booking: OwnerBookingWithNames }) {
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
          style={[
            styles.badge,
            { backgroundColor: happeningNow ? theme.colors.tertiaryContainer : theme.colors.primaryContainer },
          ]}
        >
          <Text
            variant="labelMedium"
            style={{ color: happeningNow ? theme.colors.onTertiaryContainer : theme.colors.onPrimaryContainer }}
          >
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

function Detail({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
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
  content: { gap: spacing.lg },
  group: { gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel: { width: 86 },
});
