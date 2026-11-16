import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Dialog, HelperText, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper';
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
import { BookingCalendar } from '@/features/bookings/BookingCalendar';
import { TimeWheelPicker } from '@/features/bookings/TimeWheelPicker';
import { useCreateBooking, useStationBookings } from '@/features/bookings/hooks';
import {
  TARGET_OPTIONS,
  formatMinutes,
  formatTargetValue,
  planCharge,
  saveBookingTarget,
  type ChargeTarget,
  type TargetType,
} from '@/features/bookings/chargeTarget';
import {
  addDays,
  colomboDateString,
  colomboInstant,
  colomboMinutes,
  formatClock,
  minutesToText,
  formatDay,
  freeWindows,
  generateSlotStarts,
  parseOpeningHours,
  type TimeRange,
  parseTypedTime,
} from '@/features/bookings/slots';
import { useStation } from '@/features/map/hooks';
import { useVehicles } from '@/features/profile/hooks';
import { vehicleForConnector } from '@/features/profile/vehicleFit';
import { errorMessage } from '@/lib/errors';
import { spacing, useAppTheme } from '@/lib/theme';
import type { Charger, TakenSlot } from '@/types/domain';

// Bookings can be made for today and the next 6 days (the backend allows up to 7 days ahead).
const BOOKING_DAYS = 7;

export default function NewBookingScreen() {
  const { stationId, chargerId: chargerParam } = useLocalSearchParams<{ stationId: string; chargerId?: string }>();
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const station = useStation(stationId);
  const vehicles = useVehicles(true);
  const createBooking = useCreateBooking();

  const [today] = useState(() => colomboDateString(new Date()));
  const lastDay = addDays(today, BOOKING_DAYS - 1);

  const [chargerId, setChargerId] = useState<string | null>(chargerParam ?? null);
  const [targetType, setTargetType] = useState<TargetType>('amount');
  const [amountText, setAmountText] = useState('');
  const [day, setDay] = useState(today);
  const [timeText, setTimeText] = useState('');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingDay, setPendingDay] = useState(today);
  const [submitError, setSubmitError] = useState('');

  const takenSlots = useStationBookings(stationId, day);
  const hasVehicles = (vehicles.data?.length ?? 0) > 0;

  // With saved vehicles, only chargers that fit can be picked. Without any, every charger can.
  const bookable = useMemo<Charger[]>(() => {
    if (!station.data) return [];
    if (!hasVehicles) return station.data.chargers;
    return station.data.chargers.filter((charger) => vehicleForConnector(vehicles.data, charger.connector) !== null);
  }, [station.data, vehicles.data, hasVehicles]);

  const selectedCharger = bookable.find((charger) => charger.id === chargerId) ?? bookable[0] ?? null;

  const amountValue = Number(amountText);
  const target: ChargeTarget | null =
    amountText && Number.isFinite(amountValue) && amountValue > 0 ? { type: targetType, value: amountValue } : null;
  const plan = target && selectedCharger ? planCharge(target, selectedCharger.powerKw, selectedCharger.ratePerKwh) : null;
  const slotMinutes = plan?.slotMinutes ?? 30;

  const slotStarts = useMemo(() => {
    if (!station.data) return [];
    return generateSlotStarts(station.data.openingHours, day, slotMinutes);
  }, [station.data, day, slotMinutes]);

  function isTaken(startAt: Date): boolean {
    if (!selectedCharger || !takenSlots.data) return false;
    const endAt = new Date(startAt.getTime() + slotMinutes * 60 * 1000);
    return (takenSlots.data as TakenSlot[]).some(
      (slot) =>
        slot.chargerId === selectedCharger.id && new Date(slot.startAt) < endAt && new Date(slot.endAt) > startAt,
    );
  }

  // What is already booked on the chosen port that day, and when it is free, shown to
  // every customer (times only, never who booked) so they can pick a time that works.
  const dayStart = colomboInstant(day, 0);
  const dayEnd = colomboInstant(day, 24 * 60);
  const bookedRanges: TimeRange[] = ((takenSlots.data ?? []) as TakenSlot[])
    .filter((slot) => slot.chargerId === selectedCharger?.id)
    .map((slot) => ({
      start: new Date(Math.max(new Date(slot.startAt).getTime(), dayStart.getTime())),
      end: new Date(Math.min(new Date(slot.endAt).getTime(), dayEnd.getTime())),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const openRanges = station.data ? freeWindows(station.data.openingHours, day, bookedRanges) : [];

  function openCalendar() {
    setPendingDay(day);
    setCalendarOpen(true);
  }


  // Checks a start time ("HH:MM") and says plainly what is wrong with it.
  function checkTime(text = timeText): { startAt: Date | null; problem: string | null; suggestion: Date | null } {
    const none = { startAt: null, problem: null, suggestion: null };
    if (!text.trim()) return none;
    const minutes = parseTypedTime(text);
    if (minutes === null) return { ...none, problem: 'Choose a start time.' };
    if (minutes % 30 !== 0) return { ...none, problem: 'Bookings start on the hour or half hour.' };
    const startAt = colomboInstant(day, minutes);
    if (startAt.getTime() < Date.now()) return { ...none, problem: 'That time has already passed. Choose a later time.' };
    if (!slotStarts.some((slot) => slot.getTime() === startAt.getTime())) {
      return {
        ...none,
        problem: `The station is open ${station.data?.openingHours}. A ${formatMinutes(slotMinutes)} booking must finish by closing time.`,
      };
    }
    if (isTaken(startAt)) {
      const suggestion = slotStarts.find((slot) => slot > startAt && !isTaken(slot)) ?? null;
      return { startAt: null, problem: `${selectedCharger?.label} is already booked at that time.`, suggestion };
    }
    return { startAt, problem: null, suggestion: null };
  }

  async function confirmBooking(startAt: Date) {
    if (!selectedCharger || !target || !plan || plan.problem) return;
    setSubmitError('');
    try {
      const booking = await createBooking.mutateAsync({
        chargerId: selectedCharger.id,
        startAt: startAt.toISOString(),
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

  const option = TARGET_OPTIONS[targetType];
  const time = checkTime();
  const dayLabel = day === today ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : formatDay(day);
  // Words for the plain "what's booked" message under the date.
  const isToday = day === today;
  const portName = selectedCharger?.label ?? 'This port';
  const dayWords = isToday ? 'today' : dayLabel === 'Tomorrow' ? 'tomorrow' : `on ${formatDay(day)}`;
  const openMinute = station.data ? (parseOpeningHours(station.data.openingHours)?.openMin ?? 0) : 0;
  const firstFree = openRanges[0];
  const someTimePassed = isToday && !!firstFree && firstFree.start > colomboInstant(day, openMinute);
  const timeText24 = (range: TimeRange) =>
    `${formatClock(range.start)} – ${range.end >= dayEnd ? 'midnight' : formatClock(range.end)}`;
  const endAt = time.startAt ? new Date(time.startAt.getTime() + slotMinutes * 60 * 1000) : null;
  const amountProblem = amountText && !target ? 'Type a number.' : plan?.problem ?? null;
  // Never confirm before the booked times are known, so a taken time can't slip through.
  const bookingsKnown = takenSlots.isSuccess;
  const ready = !!selectedCharger && !!plan && !plan.problem && !!time.startAt && bookingsKnown;
  const buttonLabel =
    !plan || plan.problem
      ? 'Enter how much to charge'
      : !time.startAt
        ? 'Enter a start time'
        : !bookingsKnown
          ? 'Checking booked times…'
          : 'Confirm booking';

  const footer =
    bookable.length > 0 && selectedCharger ? (
      <View style={styles.footer}>
        <View style={[styles.summary, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.flex}>
            <Text variant="titleSmall" numberOfLines={1}>
              {selectedCharger.label} · {dayLabel}
              {time.startAt && endAt ? ` ${formatClock(time.startAt)} – ${formatClock(endAt)}` : ''}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {target && plan && !plan.problem ? `${formatTargetValue(target)} · ≈ ${plan.kwh.toFixed(1)} kWh` : 'Fill in the steps above'}
            </Text>
          </View>
          {plan && !plan.problem ? (
            <View style={styles.summaryCost}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Up to
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                LKR {Math.round(plan.limit).toLocaleString('en-LK')}
              </Text>
            </View>
          ) : null}
        </View>
        {submitError ? (
          <HelperText type="error" style={styles.noPad}>
            {submitError}
          </HelperText>
        ) : null}
        <AppButton
          label={buttonLabel}
          icon="calendar-check"
          onPress={() => (time.startAt ? void confirmBooking(time.startAt) : undefined)}
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
            {station.data.address} · Open {station.data.openingHours}
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
                    setSubmitError('');
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

          <Step number={2} title="How much to charge" hint="Pick one, then type it" />
          <SegmentedButtons
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value as TargetType);
              setAmountText('');
              setSubmitError('');
            }}
            buttons={(Object.keys(TARGET_OPTIONS) as TargetType[]).map((type) => ({
              value: type,
              label: TARGET_OPTIONS[type].label,
              icon: TARGET_OPTIONS[type].icon,
            }))}
          />
          <TextInput
            mode="outlined"
            label={option.question}
            placeholder={option.example}
            value={amountText}
            onChangeText={(text) => {
              setAmountText(text.replace(/[^0-9.]/g, ''));
              setSubmitError('');
            }}
            keyboardType="decimal-pad"
            right={<TextInput.Affix text={option.unit} />}
            error={!!amountProblem}
            style={styles.input}
          />
          {amountProblem ? (
            <HelperText type="error" style={styles.noPad}>
              {amountProblem}
            </HelperText>
          ) : plan ? (
            <HelperText type="info" style={styles.noPad}>
              {targetType === 'amount'
                ? `≈ ${plan.kwh.toFixed(1)} kWh, about ${formatMinutes(plan.chargeMinutes)} of charging`
                : targetType === 'time'
                  ? `≈ ${plan.kwh.toFixed(1)} kWh, costs up to LKR ${Math.round(plan.limit).toLocaleString('en-LK')}`
                  : `About ${formatMinutes(plan.chargeMinutes)} of charging, costs up to LKR ${Math.round(plan.limit).toLocaleString('en-LK')}`}
            </HelperText>
          ) : null}

          <Step number={3} title="Date" hint="Up to 7 days ahead" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Date, ${formatDay(day)}. Change date`}
            onPress={openCalendar}
            style={({ pressed }) => [
              styles.dateField,
              {
                backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <View style={[styles.dateIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="calendar-month" size={22} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={styles.flex}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {dayLabel === 'Today' || dayLabel === 'Tomorrow' ? dayLabel : 'Date'}
              </Text>
              <Text variant="titleMedium">{formatDay(day)}</Text>
            </View>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Change
            </Text>
          </Pressable>
          {takenSlots.isLoading ? (
            <Text variant="bodySmall" style={[styles.bookedNote, { color: theme.colors.onSurfaceVariant }]}>
              Checking bookings for this day…
            </Text>
          ) : takenSlots.isError ? (
            <View style={[styles.timeProblem, styles.bookedNote]}>
              <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.error }]}>
                Couldn't load the booked times. Check your connection.
              </Text>
              <Button compact mode="contained-tonal" onPress={() => void takenSlots.refetch()}>
                Retry
              </Button>
            </View>
          ) : bookedRanges.length > 0 ? (
            <View style={[styles.bookedBox, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons name="calendar-remove" size={22} color={theme.colors.onErrorContainer} />
              <View style={styles.flex}>
                <Text variant="titleSmall" style={{ color: theme.colors.onErrorContainer }}>
                  {portName} is already booked {dayWords} at:
                </Text>
                {bookedRanges.map((range) => (
                  <Text key={range.start.toISOString()} variant="bodyLarge" style={{ color: theme.colors.onErrorContainer }}>
                    {'\u2022'} {timeText24(range)}
                  </Text>
                ))}
                <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                  {openRanges.length === 0
                    ? 'There is no free time left this day. Choose another date.'
                    : someTimePassed
                      ? `Any other time from ${formatClock(firstFree.start)} is free to book.`
                      : 'Any other time is free to book.'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.bookedBox, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="calendar-check" size={22} color={theme.colors.onPrimaryContainer} />
              <View style={styles.flex}>
                <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  No one has booked {portName} {dayWords} yet
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {openRanges.length === 0
                    ? 'The station has no time left this day. Choose another date.'
                    : someTimePassed
                      ? `Earlier times today have passed, so you can book any time from ${formatClock(firstFree.start)}.`
                      : 'You can book any time the station is open.'}
                </Text>
              </View>
            </View>
          )}
          <Portal>
            <Dialog visible={calendarOpen} onDismiss={() => setCalendarOpen(false)} style={styles.dateDialog}>
              <View style={[styles.dateDialogHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Select date
                </Text>
                <Text variant="headlineSmall">{formatDay(pendingDay)}</Text>
              </View>
              <Dialog.Content style={styles.dateDialogBody}>
                <BookingCalendar bare value={pendingDay} today={today} lastDay={lastDay} onChange={setPendingDay} />
                <Text variant="bodySmall" style={[styles.dateDialogNote, { color: theme.colors.onSurfaceVariant }]}>
                  You can book today and up to 6 days ahead.
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setCalendarOpen(false)}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setDay(pendingDay);
                    setSubmitError('');
                    setCalendarOpen(false);
                  }}
                >
                  OK
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>

          <Step number={4} title="Start time" hint={`${dayLabel}${plan && !plan.problem ? ` · holds ${formatMinutes(slotMinutes)}` : ''}`} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={time.startAt ? `Start time, ${formatClock(time.startAt)}. Change time` : 'Choose a start time'}
            onPress={() => setTimePickerOpen(true)}
            style={({ pressed }) => [
              styles.dateField,
              {
                backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                borderColor: time.problem ? theme.colors.error : timeText ? theme.colors.primary : theme.colors.outline,
              },
            ]}
          >
            <View style={[styles.dateIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={styles.flex}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Start time
              </Text>
              <Text variant="titleMedium" style={{ color: timeText ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                {timeText && parseTypedTime(timeText) !== null
                  ? formatClock(colomboInstant(day, parseTypedTime(timeText)!))
                  : 'Choose a time'}
              </Text>
            </View>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              {timeText ? 'Change' : 'Choose'}
            </Text>
          </Pressable>
          {time.problem ? (
            <View style={styles.timeProblem}>
              <HelperText type="error" style={[styles.noPad, styles.flex]}>
                {time.problem}
              </HelperText>
              {time.suggestion ? (
                <Button mode="contained-tonal" compact onPress={() => setTimeText(minutesToText(colomboMinutes(time.suggestion!)))}>
                  Use {formatClock(time.suggestion)}
                </Button>
              ) : null}
            </View>
          ) : (
            <HelperText type="info" style={styles.noPad}>
              {time.startAt && endAt
                ? `\u2713 That time is free. ${portName} will be yours from ${formatClock(time.startAt)} to ${formatClock(endAt)}.`
                : 'Tap to pick the hour, minutes and AM or PM.'}
            </HelperText>
          )}
          <TimeWheelPicker
            visible={timePickerOpen}
            initialMinutes={
              timeText && parseTypedTime(timeText) !== null
                ? parseTypedTime(timeText)!
                : isToday && firstFree
                  ? colomboMinutes(firstFree.start)
                  : 9 * 60
            }
            onCancel={() => setTimePickerOpen(false)}
            onSave={(minutes) => {
              setTimeText(minutesToText(minutes));
              setSubmitError('');
              setTimePickerOpen(false);
            }}
            describe={(minutes) => {
              const check = checkTime(minutesToText(minutes));
              if (check.startAt) {
                const until = new Date(check.startAt.getTime() + slotMinutes * 60 * 1000);
                return { ok: true, text: `Free \u2013 ${portName} is yours ${formatClock(check.startAt)} to ${formatClock(until)}` };
              }
              return { ok: false, text: check.problem ?? 'Choose a start time.' };
            }}
          />

          <View style={[styles.notice, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
              Booking is free and you can hold one at a time. Scan the port's QR within 15 minutes of your start
              time, or the booking is cancelled. You pay only for the energy you use.
            </Text>
          </View>
        </View>
      )}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  noPad: { paddingHorizontal: 0 },
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
    marginTop: spacing.xl,
  },
  input: { marginTop: spacing.md },
  timeProblem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 14, padding: spacing.md },
  dateIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDialog: { maxWidth: 420, width: '92%', alignSelf: 'center' },
  dateDialogHeader: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  dateDialogBody: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  dateDialogNote: { textAlign: 'center', marginTop: spacing.xs },
  bookedBox: { flexDirection: 'row', gap: spacing.md, borderRadius: 14, padding: spacing.md, marginTop: spacing.sm },
  bookedNote: { marginTop: spacing.sm },
  footer: { gap: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 12, padding: spacing.md },
  summaryCost: { alignItems: 'flex-end' },
});
