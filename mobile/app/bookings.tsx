import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import {
  AppButton,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  StatusBadge,
  useSnackbar,
} from '@/components';
import { useCancelBooking, useMyBookings } from '@/features/bookings/hooks';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { BookingWithNames } from '@/types/domain';

function canScanNow(booking: BookingWithNames): boolean {
  const startMs = new Date(booking.startAt).getTime();
  return booking.status === 'booked' && Date.now() >= startMs - 5 * 60 * 1000;
}

export default function MyBookingsScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const bookings = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [toCancel, setToCancel] = useState<BookingWithNames | null>(null);

  const { upcoming, past } = useMemo(() => {
    const items = bookings.data ?? [];
    return {
      upcoming: items.filter((booking) => booking.status === 'booked'),
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
      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon="calendar-clock"
          title="No bookings yet"
          message="Book a charger from a station's page to reserve a time slot."
        />
      ) : null}

      {upcoming.map((booking) => (
        <Card
          key={booking.id}
          title={booking.stationName}
          subtitle={`${booking.chargerLabel} · ${formatDate(booking.startAt)}`}
          right={<StatusBadge status="booked" label="Upcoming" />}
        >
          <View style={{ gap: spacing.sm }}>
            {canScanNow(booking) ? (
              <AppButton label="Scan QR to start" icon="qrcode-scan" onPress={() => router.push('/scan')} />
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                You can scan the charger's QR from 5 minutes before the slot starts.
              </Text>
            )}
            <AppButton label="Cancel booking" danger onPress={() => setToCancel(booking)} />
          </View>
        </Card>
      ))}

      {past.length > 0 ? (
        <>
          <Text variant="titleMedium" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            Past bookings
          </Text>
          <FlatList
            data={past}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card
                title={item.stationName}
                subtitle={`${item.chargerLabel} · ${formatDate(item.startAt)}`}
                right={<StatusBadge status={item.status} />}
              >
                <View />
              </Card>
            )}
          />
        </>
      ) : null}

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
