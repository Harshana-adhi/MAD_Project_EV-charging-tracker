import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyBookings } from '@/features/bookings/hooks';
import { formatTargetValue, loadBookingTarget, planCharge, type ChargeTarget } from '@/features/bookings/chargeTarget';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Chip, Dialog, Portal, Text, Button } from 'react-native-paper';
import { z } from 'zod';
import { AppButton, AppTextInput, Card, ConnectorChip, ErrorView, LoadingView, Screen, StatusBadge } from '@/components';
import { useChargerByQr, useStartSession } from '@/features/session/hooks';
import { useVehicles } from '@/features/profile/hooks';
import { vehicleForConnector } from '@/features/profile/vehicleFit';
import { formatCredits } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';

const limitSchema = z.object({
  spendingLimit: z.number().min(100).max(20000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8),
});
type LimitForm = z.infer<typeof limitSchema>;

export default function StartSessionScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const theme = useAppTheme();
  const charger = useChargerByQr(token ?? '');
  const start = useStartSession();
  const vehicles = useVehicles();
  const [custom, setCustom] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { control, setValue, watch, handleSubmit, formState: { errors } } = useForm<LimitForm>({
    resolver: zodResolver(limitSchema),
    defaultValues: { spendingLimit: 500 },
    mode: 'onChange',
  });
  const spendingLimit = watch('spendingLimit');
  const myBookings = useMyBookings();
  const [bookedTarget, setBookedTarget] = useState<ChargeTarget | null>(null);

  useFocusEffect(useCallback(() => {
    charger.refetch();
  }, [charger.refetch]));

  // If the customer booked this port, start with the charge they chose when booking.
  const pointId = charger.data?.charger.id;
  const booking = myBookings.data?.find((item) => item.status === 'booked' && item.chargerId === pointId);
  useEffect(() => {
    if (!booking || !charger.data) return;
    let cancelled = false;
    void loadBookingTarget(booking.id).then((target) => {
      if (cancelled || !target || !charger.data) return;
      const plan = planCharge(target, charger.data.charger.powerKw, charger.data.charger.ratePerKwh);
      if (plan.problem) return;
      setBookedTarget(target);
      setCustom(![500, 1000, 2000].includes(plan.limit));
      setValue('spendingLimit', plan.limit, { shouldValidate: true });
    });
    return () => {
      cancelled = true;
    };
  }, [booking?.id, charger.data, setValue]);

  async function submit(values: LimitForm) {
    try {
      const session = await start.mutateAsync({ qrToken: token, spendingLimit: values.spendingLimit });
      router.replace({ pathname: '/session/[id]', params: { id: session.id } });
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'SERVER_ERROR');
    }
  }

  if (charger.isPending) return <Screen><LoadingView message="Checking charger" /></Screen>;
  if (charger.isError) return <Screen><ErrorView error={charger.error} onRetry={() => charger.refetch()} /></Screen>;

  const { station, charger: point, available } = charger.data;
  const validLimit = limitSchema.safeParse({ spendingLimit }).success;
  const shortfall = validLimit ? Math.ceil(Math.max(0, spendingLimit - available) / 100) * 100 : 0;
  const estimatedKwh = validLimit && point.ratePerKwh > 0 ? spendingLimit / point.ratePerKwh : 0;
  const estimatedHours = point.powerKw > 0 ? estimatedKwh / point.powerKw : 0;
  const savedVehicles = vehicles.data ?? [];
  // Only warn when the customer has saved vehicles and none of them takes this plug.
  const plugMismatch = savedVehicles.length > 0 && !vehicleForConnector(savedVehicles, point.connector);

  return (
    <Screen title="Start charging" back scroll>
      <View style={{ gap: spacing.xl }}>
        <Card title={station.name} subtitle={station.address} right={<StatusBadge status={point.status} />}>
          <Text variant="bodyLarge">{point.label}</Text>
          <ConnectorChip connector={point.connector} />
          <Text variant="bodyMedium">{point.powerKw} kW · {formatCredits(point.ratePerKwh)} / kWh</Text>
        </Card>
        {plugMismatch ? (
          <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: 12, backgroundColor: theme.colors.errorContainer }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onErrorContainer }}>
              This plug may not fit your car
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
              {point.label} is {point.connector}, but your saved vehicles use{' '}
              {[...new Set(savedVehicles.map((vehicle) => vehicle.connector))].join(' or ')}. Check the plug, or go
              back and scan another charger at this station.
            </Text>
          </View>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <Text variant="titleMedium">Available balance</Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>{formatCredits(available)}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <Text variant="titleMedium">Spending limit</Text>
          {bookedTarget ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, backgroundColor: theme.colors.primaryContainer }}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={theme.colors.onPrimaryContainer} />
              <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onPrimaryContainer }}>
                Filled in from your booking: {formatTargetValue(bookedTarget)}. You can still change it.
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[500, 1000, 2000].map((amount) => (
              <Chip key={amount} selected={!custom && spendingLimit === amount} onPress={() => {
                setCustom(false);
                setValue('spendingLimit', amount, { shouldValidate: true });
              }}>{formatCredits(amount)}</Chip>
            ))}
            <Chip selected={custom} onPress={() => setCustom(true)}>Custom</Chip>
          </View>
          {custom ? (
            <Controller control={control} name="spendingLimit" render={({ field }) => (
              <AppTextInput
                label="Limit in LKR"
                value={String(field.value || '')}
                onChangeText={(text) => field.onChange(Number(text))}
                keyboardType="decimal-pad"
                error={errors.spendingLimit?.message}
                disabled={start.isPending}
              />
            )} />
          ) : null}
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            About {estimatedKwh.toFixed(2)} kWh · {Math.round(estimatedHours * 60)} simulated minutes
          </Text>
        </View>
        {shortfall > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
              Add {formatCredits(shortfall)} to cover this limit.
            </Text>
            <AppButton label={`Top up ${formatCredits(shortfall)}`} mode="contained-tonal" onPress={() =>
              router.push({ pathname: '/topup', params: { amount: String(shortfall) } })
            } />
          </View>
        ) : null}
        <AppButton
          label="Start charging"
          onPress={handleSubmit(submit)}
          loading={start.isPending}
          disabled={start.isPending || !validLimit || shortfall > 0 || point.status !== 'available'}
        />
      </View>
      <Portal>
        <Dialog visible={!!startError} onDismiss={() => setStartError(null)}>
          <Dialog.Title>Unable to start charging</Dialog.Title>
          <Dialog.Content><Text>{errorMessage(new Error(startError ?? 'SERVER_ERROR'))}</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStartError(null)}>OK</Button>
            {startError === 'ACTIVE_SESSION_EXISTS' ? (
              <Button onPress={() => { setStartError(null); router.replace('/(customer)/sessions'); }}>Go to my session</Button>
            ) : null}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
