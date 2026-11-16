import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { HelperText, SegmentedButtons, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppButton,
  ConnectorChip,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { useCreateBooking, useStationBookings } from '@/features/bookings/hooks';
import {
  dayPart,
  dayPickerLabel,
  generateSlotStarts,
  nextSevenDays,
  slotCost,
  type DayPart,
} from '@/features/bookings/slots';
import { useStation } from '@/features/map/hooks';
import { useVehicles } from '@/features/profile/hooks';
import { vehicleForConnector } from '@/features/profile/vehicleFit';
import { errorMessage } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { Charger, TakenSlot } from '@/types/domain';

const DAYS = nextSevenDays();

export default function NewBookingScreen() {
  const { stationId, chargerId: chargerParam } = useLocalSearchParams<{ stationId: string; chargerId?: string }>();
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const station = useStation(stationId);
  const vehicles = useVehicles(true);
  const createBooking = useCreateBooking();

  const [chargerId, setChargerId] = useState<string | null>(chargerParam ?? null);
  const [day, setDay] = useState(DAYS[0].value);
  const [duration, setDuration] = useState<30 | 60>(30);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
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

  // Consecutive slots grouped by part of the day, so the grid reads Morning, Afternoon, Evening.
  const slotGroups = useMemo(() => {
    const groups: { part: DayPart; starts: Date[] }[] = [];
    for (const startAt of slotStarts) {
      const part = dayPart(startAt);
      const last = groups[groups.length - 1];
      if (last && last.part === part) last.starts.push(startAt);
      else groups.push({ part, starts: [startAt] });
    }
    return groups;
  }, [slotStarts]);

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

  function resetTime() {
    setSelectedStart(null);
    setSubmitError('');
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
      snackbar.show('Booking confirmed');
      router.replace('/bookings');
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  }

  if (station.isLoading || vehicles.isLoading) return <LoadingView />;
  if (station.isError || !station.data) return <ErrorView error={station.error} onRetry={() => station.refetch()} />;

  const canBook = compatibleChargers.length > 0 && (vehicles.data?.length ?? 0) > 0;
  const dayIndex = DAYS.findIndex((item) => item.value === day);
  const dayLabel = dayIndex === 0 ? 'Today' : dayIndex === 1 ? 'Tomorrow' : DAYS[dayIndex]?.label;
  const endAt = selectedStart ? new Date(selectedStart.getTime() + duration * 60 * 1000) : null;

  const footer = canBook ? (
    <View style={styles.footer}>
      <View style={[styles.summary, { backgroundColor: theme.colors.surfaceVariant }]}>
        <SummaryRow
          label="Your slot"
          value={
            selectedStart && endAt
              ? `${dayLabel} · ${formatTime(selectedStart.toISOString())}–${formatTime(endAt.toISOString())}`
              : 'Pick a start time'
          }
        />
        {selectedCharger ? (
          <SummaryRow
            label="Estimated cost"
            value={`up to LKR ${slotCost(selectedCharger.powerKw, selectedCharger.ratePerKwh, duration).toLocaleString('en-LK')}`}
            highlight
          />
        ) : null}
      </View>
      {submitError ? (
        <HelperText type="error" style={styles.noPad}>
          {submitError}
        </HelperText>
      ) : null}
      <AppButton
        label={selectedStart ? 'Confirm booking' : 'Pick a time to book'}
        icon="calendar-check"
        onPress={() => void confirmBooking()}
        disabled={!selectedStart || !selectedCharger}
        loading={createBooking.isPending}
      />
    </View>
  ) : undefined;

  return (
    <Screen scroll title="Book a charger" back footer={footer}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {station.data.name} · {station.data.address}
      </Text>
      {(vehicles.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="car-electric"
          title="Add your car first"
          message="We use your car's plug type to show which chargers here you can book."
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
        <View>
          <SectionTitle icon="ev-station" title="Charger" />
          <View style={styles.chargerList}>
            {compatibleChargers.map((charger) => {
              const selected = selectedCharger?.id === charger.id;
              const fits = vehicleForConnector(vehicles.data, charger.connector);
              return (
                <Pressable
                  key={charger.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setChargerId(charger.id);
                    resetTime();
                  }}
                  style={[
                    styles.chargerCard,
                    {
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? theme.colors.primaryContainer + '55' : theme.colors.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={selected ? theme.colors.primary : theme.colors.outline}
                  />
                  <View style={styles.flex}>
                    <View style={styles.chargerTitle}>
                      <Text variant="titleSmall">{charger.label}</Text>
                      <ConnectorChip connector={charger.connector} />
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {charger.powerKw} kW · LKR {charger.ratePerKwh} / kWh
                      {fits ? ` · fits your ${fits.makeModel}` : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <SectionTitle icon="calendar-month-outline" title="Day" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
            {DAYS.map((item, index) => {
              const selected = day === item.value;
              const label = dayPickerLabel(item.value, index);
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.label}
                  onPress={() => {
                    setDay(item.value);
                    resetTime();
                  }}
                  style={[
                    styles.day,
                    selected
                      ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      : { borderColor: theme.colors.outlineVariant },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
                  >
                    {label.top}
                  </Text>
                  <Text variant="titleMedium" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {label.bottom}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <SectionTitle icon="timer-outline" title="How long" />
          <SegmentedButtons
            value={String(duration)}
            onValueChange={(value) => {
              setDuration(Number(value) as 30 | 60);
              resetTime();
            }}
            buttons={[
              { value: '30', label: '30 min' },
              { value: '60', label: '1 hour' },
            ]}
          />

          <View style={styles.timeHeader}>
            <SectionTitle icon="clock-outline" title="Start time" />
            <View style={styles.legend}>
              <View style={[styles.legendBox, { borderColor: theme.colors.outline }]} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Taken
              </Text>
            </View>
          </View>
          {takenSlots.isLoading ? (
            <LoadingView message="Loading times…" />
          ) : slotGroups.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No times left this day. Try another day.
            </Text>
          ) : (
            slotGroups.map((group, groupIndex) => (
              <View key={`${group.part}-${groupIndex}`} style={styles.group}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {group.part}
                </Text>
                <View style={styles.slotGrid}>
                  {group.starts.map((startAt) => {
                    const taken = isTaken(startAt);
                    const selected = selectedStart?.getTime() === startAt.getTime();
                    const time = formatTime(startAt.toISOString());
                    return (
                      <Pressable
                        key={startAt.toISOString()}
                        disabled={taken}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: taken }}
                        accessibilityLabel={taken ? `${time}, taken` : time}
                        onPress={() => {
                          setSelectedStart(startAt);
                          setSubmitError('');
                        }}
                        style={[
                          styles.slot,
                          selected
                            ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            : taken
                              ? { borderColor: theme.colors.outlineVariant, borderStyle: 'dashed' }
                              : { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
                        ]}
                      >
                        <Text
                          variant="labelLarge"
                          style={{
                            color: selected
                              ? theme.colors.onPrimary
                              : taken
                                ? theme.colors.outline
                                : theme.colors.onSurface,
                            textDecorationLine: taken ? 'line-through' : 'none',
                          }}
                        >
                          {time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          <View style={[styles.note, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
              Booking is free and you can hold one at a time. Scan the charger's QR within 15 minutes of your start
              time, or the booking is cancelled. You pay only for the energy you use.
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.sectionTitle}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={18}
        color={theme.colors.primary}
      />
      <Text variant="titleMedium">{title}</Text>
    </View>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.summaryRow}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleSmall" style={highlight ? { color: theme.colors.primary } : undefined}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noPad: { paddingHorizontal: 0 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chargerList: { gap: spacing.sm },
  chargerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 14,
    padding: spacing.md,
  },
  chargerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  dayRow: { gap: spacing.sm },
  day: {
    width: 56,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  legendBox: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed' },
  group: { gap: spacing.xs, marginBottom: spacing.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '22.5%',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  footer: { gap: spacing.sm },
  summary: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
