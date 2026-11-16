import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Chip, SegmentedButtons, Text } from 'react-native-paper';
import {
  AppButton,
  ConfirmDialog,
  ConnectorChip,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { useCreateBooking, useStationBookings } from '@/features/bookings/hooks';
import { generateSlotStarts, nextSevenDays } from '@/features/bookings/slots';
import { useStation } from '@/features/map/hooks';
import { useVehicles } from '@/features/profile/hooks';
import { vehicleForConnector } from '@/features/profile/vehicleFit';
import { errorMessage } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { Charger, TakenSlot } from '@/types/domain';

const DAYS = nextSevenDays();

export default function NewBookingScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const station = useStation(stationId);
  const vehicles = useVehicles(true);
  const createBooking = useCreateBooking();

  const [chargerId, setChargerId] = useState<string | null>(null);
  const [day, setDay] = useState(DAYS[0].value);
  const [duration, setDuration] = useState<30 | 60>(30);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const takenSlots = useStationBookings(stationId, day);

  const compatibleChargers = useMemo<Charger[]>(() => {
    if (!station.data) return [];
    return station.data.chargers.filter((charger) => vehicleForConnector(vehicles.data, charger.connector) !== null);
  }, [station.data, vehicles.data]);

  const selectedCharger = compatibleChargers.find((c) => c.id === chargerId) ?? compatibleChargers[0] ?? null;

  const slotStarts = useMemo(() => {
    if (!station.data || !selectedCharger) return [];
    return generateSlotStarts(station.data.openingHours, day, duration);
  }, [station.data, selectedCharger, day, duration]);

  function isTaken(startAt: Date): boolean {
    if (!selectedCharger || !takenSlots.data) return false;
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
    return (takenSlots.data as TakenSlot[]).some(
      (slot) =>
        slot.chargerId === selectedCharger.id &&
        new Date(slot.startAt) < endAt &&
        new Date(slot.endAt) > startAt,
    );
  }

  async function confirmBooking() {
    if (!selectedCharger || !selectedStart) return;
    setSubmitError('');
    try {
      await createBooking.mutateAsync({
        chargerId: selectedCharger.id,
        startAt: selectedStart.toISOString(),
        durationMinutes: duration,
      });
      setConfirmOpen(false);
      snackbar.show('Booking confirmed');
      router.replace('/bookings');
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  }

  if (station.isLoading || vehicles.isLoading) return <LoadingView />;
  if (station.isError || !station.data) return <ErrorView error={station.error} onRetry={() => station.refetch()} />;

  return (
    <Screen scroll title="Book a charger" back>
      {(vehicles.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="car-electric"
          title="No vehicles saved"
          message="Add a vehicle to see which chargers here fit it."
          actionLabel="Add a vehicle"
          onAction={() => router.push('/vehicles')}
        />
      ) : compatibleChargers.length === 0 ? (
        <EmptyState
          icon="ev-plug-type2"
          title="No matching chargers"
          message="None of this station's chargers fit your saved vehicles."
        />
      ) : (
        <View style={styles.content}>
          <Text variant="titleMedium">Charger</Text>
          <View style={styles.chipRow}>
            {compatibleChargers.map((charger) => (
              <Chip
                key={charger.id}
                selected={selectedCharger?.id === charger.id}
                onPress={() => setChargerId(charger.id)}
                icon="ev-station"
              >
                {charger.label} · {charger.powerKw} kW
              </Chip>
            ))}
          </View>
          {selectedCharger ? <ConnectorChip connector={selectedCharger.connector} /> : null}

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Day
          </Text>
          <View style={styles.chipRow}>
            {DAYS.map((item) => (
              <Chip
                key={item.value}
                selected={day === item.value}
                onPress={() => {
                  setDay(item.value);
                  setSelectedStart(null);
                }}
              >
                {item.label}
              </Chip>
            ))}
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Duration
          </Text>
          <SegmentedButtons
            value={String(duration)}
            onValueChange={(value) => {
              setDuration(Number(value) as 30 | 60);
              setSelectedStart(null);
            }}
            buttons={[
              { value: '30', label: '30 min' },
              { value: '60', label: '60 min' },
            ]}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Time
          </Text>
          {takenSlots.isLoading ? <LoadingView message="Loading slots…" /> : null}
          <View style={styles.chipRow}>
            {slotStarts.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No slots available that day.
              </Text>
            ) : (
              slotStarts.map((startAt) => {
                const taken = isTaken(startAt);
                return (
                  <Chip
                    key={startAt.toISOString()}
                    disabled={taken}
                    selected={selectedStart?.getTime() === startAt.getTime()}
                    onPress={() => setSelectedStart(startAt)}
                  >
                    {taken ? `${formatTime(startAt.toISOString())} · Booked` : formatTime(startAt.toISOString())}
                  </Chip>
                );
              })
            )}
          </View>

          <AppButton
            label="Book this slot"
            onPress={() => setConfirmOpen(true)}
            disabled={!selectedStart || !selectedCharger}
            style={styles.confirmButton}
          />
        </View>
      )}

      <ConfirmDialog
        visible={confirmOpen}
        title="Confirm booking"
        message={
          selectedStart && selectedCharger
            ? `Book ${selectedCharger.label} on ${day} at ${formatTime(selectedStart.toISOString())} for ${duration} minutes?${
                submitError ? `\n\n${submitError}` : ''
              }`
            : ''
        }
        confirmLabel="Confirm"
        onConfirm={() => void confirmBooking()}
        onDismiss={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { marginTop: spacing.lg },
  confirmButton: { marginTop: spacing.xl },
});
