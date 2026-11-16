import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Dialog, HelperText, IconButton, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AppButton,
  ConnectorChip,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  StatusBadge,
  useSnackbar,
} from '@/components';
import { useCreateBooking, useStationBookings } from '@/features/bookings/hooks';
import {
  DEFAULT_TARGETS,
  TARGET_OPTIONS,
  formatMinutes,
  formatTargetValue,
  planCharge,
  saveBookingTarget,
  type ChargeTarget,
  type TargetType,
} from '@/features/bookings/chargeTarget';
import { dayPart, dayPickerLabel, generateSlotStarts, nextSevenDays, type DayPart } from '@/features/bookings/slots';
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
  const [target, setTarget] = useState<ChargeTarget>({ type: 'amount', value: DEFAULT_TARGETS.amount });
  const [draft, setDraft] = useState(String(DEFAULT_TARGETS.amount));
  const [day, setDay] = useState(DAYS[0].value);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const timeListRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // Set when the time list opens, then used once by the chosen row to scroll itself into view.
  const pendingScroll = useRef(false);

  const takenSlots = useStationBookings(stationId, day);
  const hasVehicles = (vehicles.data?.length ?? 0) > 0;

  // With saved vehicles, only chargers that fit can be picked. Without any, every charger can.
  const bookable = useMemo<Charger[]>(() => {
    if (!station.data) return [];
    if (!hasVehicles) return station.data.chargers;
    return station.data.chargers.filter((charger) => vehicleForConnector(vehicles.data, charger.connector) !== null);
  }, [station.data, vehicles.data, hasVehicles]);

  const selectedCharger = bookable.find((charger) => charger.id === chargerId) ?? bookable[0] ?? null;
  const plan = selectedCharger ? planCharge(target, selectedCharger.powerKw, selectedCharger.ratePerKwh) : null;
  const slotMinutes = plan?.slotMinutes ?? 30;

  const slotStarts = useMemo(() => {
    if (!station.data || !selectedCharger) return [];
    return generateSlotStarts(station.data.openingHours, day, slotMinutes);
  }, [station.data, selectedCharger, day, slotMinutes]);

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
    const endAt = new Date(startAt.getTime() + slotMinutes * 60 * 1000);
    return (takenSlots.data as TakenSlot[]).some(
      (slot) =>
        slot.chargerId === selectedCharger.id && new Date(slot.startAt) < endAt && new Date(slot.endAt) > startAt,
    );
  }

  const freeStarts = slotStarts.filter((startAt) => !isTaken(startAt));
  // Today: the next free times. Other days: free times from 08:00, so nobody is offered midnight.
  const isToday = day === DAYS[0].value;
  const daytimeStarts = freeStarts.filter((startAt) => formatTime(startAt.toISOString()) >= '08:00');
  const quickStarts = (isToday || daytimeStarts.length === 0 ? freeStarts : daytimeStarts).slice(0, 4);

  // The time list opens at the chosen time, or at the first quick pick, instead of at midnight.
  const scrollTarget = (selectedStart ?? quickStarts[0])?.toISOString();

  function openTimes() {
    pendingScroll.current = true;
    setTimeMenuOpen(true);
  }

  function pickTime(startAt: Date) {
    setSelectedStart(startAt);
    setSubmitError('');
    setTimeMenuOpen(false);
  }

  function clearTime() {
    setSelectedStart(null);
    setSubmitError('');
  }

  function changeTarget(next: ChargeTarget) {
    const options = TARGET_OPTIONS[next.type];
    const value = Math.min(options.max, Math.max(options.min, next.value));
    setTarget({ type: next.type, value });
    setDraft(String(value));
    clearTime();
  }

  function typeDraft(text: string) {
    const clean = text.replace(/[^0-9.]/g, '');
    setDraft(clean);
    const value = Number(clean);
    if (clean && Number.isFinite(value) && value > 0) {
      setTarget((current) => ({ ...current, value }));
      clearTime();
    }
  }

  async function confirmBooking() {
    if (!selectedCharger || !selectedStart || !plan || plan.problem) return;
    setSubmitError('');
    try {
      const booking = await createBooking.mutateAsync({
        chargerId: selectedCharger.id,
        startAt: selectedStart.toISOString(),
        durationMinutes: plan.slotMinutes,
      });
      await saveBookingTarget(booking.id, target).catch(() => undefined);
      snackbar.show('Booking confirmed');
      router.replace('/bookings');
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  }

  if (station.isLoading || vehicles.isLoading) return <LoadingView />;
  if (station.isError || !station.data) return <ErrorView error={station.error} onRetry={() => station.refetch()} />;

  const options = TARGET_OPTIONS[target.type];
  const dayIndex = DAYS.findIndex((item) => item.value === day);
  const dayLabel = dayIndex === 0 ? 'Today' : dayIndex === 1 ? 'Tomorrow' : DAYS[dayIndex]?.label;
  const endAt = selectedStart ? new Date(selectedStart.getTime() + slotMinutes * 60 * 1000) : null;
  const ready = !!selectedCharger && !!selectedStart && !!plan && !plan.problem;

  const footer =
    bookable.length > 0 && selectedCharger && plan ? (
      <View style={styles.footer}>
        <View style={[styles.summary, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.flex}>
            <Text variant="titleSmall" numberOfLines={1}>
              {selectedCharger.label} ·{' '}
              {selectedStart && endAt
                ? `${dayLabel} ${formatTime(selectedStart.toISOString())}–${formatTime(endAt.toISOString())}`
                : 'pick a start time'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {formatTargetValue(target)} ·{' '}
              {target.type === 'units' ? `≈ ${formatMinutes(plan.chargeMinutes)}` : `≈ ${plan.kwh.toFixed(1)} kWh`}
            </Text>
          </View>
          <View style={styles.summaryCost}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Up to
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              LKR {Math.round(plan.limit).toLocaleString('en-LK')}
            </Text>
          </View>
        </View>
        {submitError ? (
          <HelperText type="error" style={styles.noPad}>
            {submitError}
          </HelperText>
        ) : null}
        <AppButton
          label={plan.problem ? 'Change how much to charge' : selectedStart ? 'Confirm booking' : 'Pick a start time'}
          icon="calendar-check"
          onPress={() => void confirmBooking()}
          disabled={!ready}
          loading={createBooking.isPending}
        />
      </View>
    ) : undefined;

  return (
    <Screen scroll title="Book a charger" back footer={footer}>
      <View style={[styles.stationCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name="ev-station" size={28} color={theme.colors.onPrimaryContainer} />
        <View style={styles.flex}>
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            {station.data.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
            {station.data.address} · {station.data.openingHours}
          </Text>
        </View>
      </View>

      {bookable.length === 0 ? (
        <EmptyState
          icon="ev-plug-type2"
          title="No matching chargers"
          message="None of this station's chargers fit your saved vehicles."
        />
      ) : (
        <View>
          <Step number={1} title="Charging port" />
          {!hasVehicles ? (
            <Pressable onPress={() => router.push('/vehicles')} style={[styles.notice, { borderColor: theme.colors.outlineVariant }]}>
              <MaterialCommunityIcons name="car-electric" size={18} color={theme.colors.primary} />
              <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
                Add your car so we can show which ports fit it.
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
          <View style={styles.list}>
            {station.data.chargers.map((charger) => {
              const canPick = bookable.some((item) => item.id === charger.id);
              const selected = selectedCharger?.id === charger.id;
              const fits = vehicleForConnector(vehicles.data, charger.connector);
              return (
                <Pressable
                  key={charger.id}
                  disabled={!canPick}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !canPick }}
                  onPress={() => {
                    setChargerId(charger.id);
                    clearTime();
                  }}
                  style={[
                    styles.portCard,
                    {
                      opacity: canPick ? 1 : 0.5,
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? theme.colors.primaryContainer + '55' : theme.colors.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    color={selected ? theme.colors.primary : theme.colors.outline}
                  />
                  <View style={styles.flex}>
                    <View style={styles.row}>
                      <Text variant="titleMedium">{charger.label}</Text>
                      <ConnectorChip connector={charger.connector} />
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {charger.powerKw} kW · LKR {charger.ratePerKwh} / kWh
                    </Text>
                    {hasVehicles ? (
                      <Text variant="bodySmall" style={{ color: fits ? theme.colors.primary : theme.colors.error }}>
                        {fits ? `Fits your ${fits.makeModel}` : "Doesn't fit your car"}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={charger.status} />
                </Pressable>
              );
            })}
          </View>

          <Step number={2} title="How much to charge" hint="Choose one" />
          <SegmentedButtons
            value={target.type}
            onValueChange={(value) => {
              const type = value as TargetType;
              changeTarget({ type, value: DEFAULT_TARGETS[type] });
            }}
            buttons={(Object.keys(TARGET_OPTIONS) as TargetType[]).map((type) => ({
              value: type,
              label: TARGET_OPTIONS[type].label,
              icon: TARGET_OPTIONS[type].icon,
            }))}
          />
          <View style={[styles.valueCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <IconButton
              icon="minus"
              mode="contained-tonal"
              accessibilityLabel={`Less ${options.unit}`}
              onPress={() => changeTarget({ ...target, value: target.value - options.step })}
            />
            <View style={styles.valueMiddle}>
              <View style={styles.valueRow}>
                {target.type === 'amount' ? (
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    LKR
                  </Text>
                ) : null}
                <TextInput
                  value={draft}
                  onChangeText={typeDraft}
                  onBlur={() => changeTarget(target)}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`Charge ${options.label.toLowerCase()} in ${options.unit}`}
                  style={[styles.valueInput, { color: theme.colors.onSurface }]}
                />
                {target.type !== 'amount' ? (
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {options.unit}
                  </Text>
                ) : null}
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tap the number to type your own
              </Text>
            </View>
            <IconButton
              icon="plus"
              mode="contained-tonal"
              accessibilityLabel={`More ${options.unit}`}
              onPress={() => changeTarget({ ...target, value: target.value + options.step })}
            />
          </View>
          <View style={styles.presetRow}>
            {options.presets.map((preset) => {
              const selected = target.value === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => changeTarget({ ...target, value: preset })}
                  style={[
                    styles.preset,
                    selected
                      ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      : { borderColor: theme.colors.outlineVariant },
                  ]}
                >
                  <Text variant="labelLarge" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {formatTargetValue({ type: target.type, value: preset })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {plan ? (
            <View style={styles.statRow}>
              <Stat label="Cost" value={`LKR ${Math.round(plan.limit).toLocaleString('en-LK')}`} active={target.type === 'amount'} />
              <Stat label="Charging time" value={formatMinutes(plan.chargeMinutes)} active={target.type === 'time'} />
              <Stat label="Energy" value={`${plan.kwh.toFixed(1)} kWh`} active={target.type === 'units'} />
            </View>
          ) : null}
          {plan?.problem ? (
            <HelperText type="error" style={styles.noPad}>
              {plan.problem}
            </HelperText>
          ) : null}

          <Step number={3} title="Day" />
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
                    clearTime();
                  }}
                  style={[
                    styles.day,
                    selected
                      ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      : { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Text variant="labelSmall" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
                    {label.top}
                  </Text>
                  <Text variant="titleLarge" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {label.bottom}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Step
            number={4}
            title="Start time"
            hint={plan && !plan.problem ? `Holds ${selectedCharger?.label} for ${formatMinutes(slotMinutes)}` : undefined}
          />
          {plan?.problem ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Fix how much to charge first, then pick a time.
            </Text>
          ) : takenSlots.isLoading ? (
            <LoadingView message="Loading times…" />
          ) : slotGroups.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No times left this day for a {formatMinutes(slotMinutes)} booking. Try another day or charge less.
            </Text>
          ) : (
            <View style={styles.timeBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a start time"
                onPress={openTimes}
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: selectedStart ? theme.colors.primary : theme.colors.outline,
                    borderWidth: selectedStart ? 2 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name="clock-outline" size={22} color={theme.colors.primary} />
                <View style={styles.flex}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Start time
                  </Text>
                  <Text variant="titleMedium">
                    {selectedStart && endAt
                      ? `${formatTime(selectedStart.toISOString())} – ${formatTime(endAt.toISOString())}`
                      : 'Select a time'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {freeStarts.length > 0 ? (
                <>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {isToday ? 'Next free' : 'Quick picks'}
                  </Text>
                  <View style={[styles.presetRow, styles.noMarginTop]}>
                    {quickStarts.map((startAt) => {
                      const selected = selectedStart?.getTime() === startAt.getTime();
                      return (
                        <Pressable
                          key={startAt.toISOString()}
                          onPress={() => pickTime(startAt)}
                          style={[
                            styles.preset,
                            selected
                              ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                              : { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
                          ]}
                        >
                          <Text variant="labelLarge" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface }}>
                            {formatTime(startAt.toISOString())}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Every time this day is taken. Try another day.
                </Text>
              )}
            </View>
          )}

          <View style={[styles.notice, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
              Booking is free and you can hold one at a time. Scan the port's QR within 15 minutes of your start
              time, or the booking is cancelled. You pay only for the energy you use, never more than the cost above.
            </Text>
          </View>
        </View>
      )}

      <Portal>
        <Dialog visible={timeMenuOpen} onDismiss={() => setTimeMenuOpen(false)} style={styles.timeDialog}>
          <Dialog.Title>Choose a start time</Dialog.Title>
          <Dialog.ScrollArea style={styles.timeScrollArea}>
            <ScrollView ref={timeListRef} contentContainerStyle={styles.timeList}>
              {slotGroups.flatMap((group, groupIndex) => [
                <Text
                  key={`${group.part}-${groupIndex}`}
                  variant="labelLarge"
                  style={[styles.timeGroup, { color: theme.colors.primary }]}
                >
                  {group.part}
                </Text>,
                ...group.starts.map((startAt) => {
                  const iso = startAt.toISOString();
                  const taken = isTaken(startAt);
                  const selected = selectedStart?.getTime() === startAt.getTime();
                  const until = new Date(startAt.getTime() + slotMinutes * 60 * 1000);
                  const time = formatTime(iso);
                  return (
                    <Pressable
                      key={iso}
                      disabled={taken}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: taken }}
                      accessibilityLabel={taken ? `${time}, taken` : time}
                      onPress={() => pickTime(startAt)}
                      onLayout={(event) => {
                        if (!pendingScroll.current || iso !== scrollTarget) return;
                        pendingScroll.current = false;
                        const y = Math.max(0, event.nativeEvent.layout.y - 48);
                        requestAnimationFrame(() => timeListRef.current?.scrollTo({ y, animated: false }));
                      }}
                      style={[
                        styles.timeRow,
                        selected ? { backgroundColor: theme.colors.primaryContainer } : null,
                        { borderBottomColor: theme.colors.outlineVariant },
                      ]}
                    >
                      <Text
                        variant="titleMedium"
                        style={{
                          flex: 1,
                          color: taken ? theme.colors.outline : selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                          textDecorationLine: taken ? 'line-through' : 'none',
                        }}
                      >
                        {time} – {formatTime(until.toISOString())}
                      </Text>
                      {taken ? (
                        <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                          Taken
                        </Text>
                      ) : selected ? (
                        <MaterialCommunityIcons name="check" size={20} color={theme.colors.onPrimaryContainer} />
                      ) : null}
                    </Pressable>
                  );
                }),
              ])}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setTimeMenuOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function Step({ number, title, hint }: { number: number; title: string; hint?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
          {number}
        </Text>
      </View>
      <Text variant="titleMedium" style={styles.flex}>
        {title}
      </Text>
      {hint ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value, active }: { label: string; value: string; active: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
        },
      ]}
    >
      <Text variant="labelSmall" style={{ color: active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleSmall" style={{ color: active ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  noPad: { paddingHorizontal: 0 },
  noMarginTop: { marginTop: 0 },
  stationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm },
  portCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 16, padding: spacing.md },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: spacing.sm,
  },
  valueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
  },
  valueMiddle: { flex: 1, alignItems: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  valueInput: { fontSize: 34, fontWeight: '600', minWidth: 60, maxWidth: 140, textAlign: 'center', padding: 0 },
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  preset: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: spacing.sm, alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, borderRadius: 12, padding: spacing.sm, gap: 2 },
  dayRow: { gap: spacing.sm },
  day: { width: 58, paddingVertical: spacing.sm, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  timeBlock: { gap: spacing.sm },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 14, padding: spacing.md },
  timeDialog: { maxHeight: '80%' },
  timeScrollArea: { paddingHorizontal: 0 },
  timeList: { paddingBottom: spacing.sm },
  timeGroup: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xs },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footer: { gap: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 12, padding: spacing.md },
  summaryCost: { alignItems: 'flex-end' },
});
