import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '@/components';
import { spacing, useAppTheme } from '@/lib/theme';
import { useOwnerBookings } from './hooks';
import { bookingDayLabel, bookingTimeRange } from './ownerBookings';

const SHOWN = 3;

// Top of the owner dashboard: the next few bookings on the owner's chargers, in plain words.
export function OwnerBookingsCard() {
  const theme = useAppTheme();
  const bookings = useOwnerBookings();
  const upcoming = (bookings.data ?? []).filter((booking) => new Date(booking.endAt).getTime() > Date.now());
  const openAll = () => router.push('/owner/bookings');

  return (
    <Card
      title={`Upcoming bookings${bookings.isSuccess ? ` · ${upcoming.length}` : ''}`}
      right={<MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.primary} />}
    >
      {bookings.isLoading ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Loading bookings…
        </Text>
      ) : bookings.isError ? (
        <View style={styles.row}>
          <Text variant="bodyMedium" style={[styles.flex, { color: theme.colors.error }]}>
            Couldn't load bookings.
          </Text>
          <Button compact onPress={() => void bookings.refetch()}>
            Retry
          </Button>
        </View>
      ) : upcoming.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No one has booked your chargers yet.
        </Text>
      ) : (
        <View style={styles.list}>
          {upcoming.slice(0, SHOWN).map((booking) => (
            <Pressable
              key={booking.id}
              onPress={openAll}
              accessibilityRole="button"
              style={[styles.item, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <View style={[styles.day, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  {bookingDayLabel(booking.startAt)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="titleSmall">{bookingTimeRange(booking.startAt, booking.endAt)}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {booking.chargerLabel} · {booking.stationName} · {booking.customerName}
                </Text>
              </View>
            </Pressable>
          ))}
          {upcoming.length > SHOWN ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              +{upcoming.length - SHOWN} more
            </Text>
          ) : null}
        </View>
      )}
      <Button mode="text" icon="arrow-right" contentStyle={styles.seeAll} onPress={openAll} style={styles.seeAllButton}>
        See all bookings
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  list: { gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 12, padding: spacing.sm },
  day: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4, minWidth: 76, alignItems: 'center' },
  seeAll: { flexDirection: 'row-reverse' },
  seeAllButton: { alignSelf: 'flex-start', marginTop: spacing.xs, marginLeft: -spacing.sm },
});
