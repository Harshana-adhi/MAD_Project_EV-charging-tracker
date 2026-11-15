import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Chip, Dialog, Portal, Text, Button } from 'react-native-paper';
import { z } from 'zod';
import { AppButton, AppTextInput, Card, ConnectorChip, ErrorView, LoadingView, Screen, StatusBadge } from '@/components';
import { useChargerByQr, useStartSession } from '@/features/session/hooks';
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
  const [custom, setCustom] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { control, setValue, watch, handleSubmit, formState: { errors } } = useForm<LimitForm>({
    resolver: zodResolver(limitSchema),
    defaultValues: { spendingLimit: 500 },
    mode: 'onChange',
  });
  const spendingLimit = watch('spendingLimit');

  useFocusEffect(useCallback(() => {
    charger.refetch();
  }, [charger.refetch]));

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

  return (
    <Screen title="Start charging" back scroll>
      <View style={{ gap: spacing.xl }}>
        <Card title={station.name} subtitle={station.address} right={<StatusBadge status={point.status} />}>
          <Text variant="bodyLarge">{point.label}</Text>
          <ConnectorChip connector={point.connector} />
          <Text variant="bodyMedium">{point.powerKw} kW · {formatCredits(point.ratePerKwh)} / kWh</Text>
        </Card>
        <View style={{ gap: spacing.sm }}>
          <Text variant="titleMedium">Available balance</Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>{formatCredits(available)}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <Text variant="titleMedium">Spending limit</Text>
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
