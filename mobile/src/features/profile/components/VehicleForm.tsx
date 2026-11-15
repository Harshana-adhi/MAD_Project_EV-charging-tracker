import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { HelperText, Text } from 'react-native-paper';
import { AppButton, AppTextInput, ConnectorChip, useSnackbar } from '@/components';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';
import type { Vehicle } from '@/types/domain';
import { useCreateVehicle, useUpdateVehicle } from '../hooks';

const CONNECTORS = ['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT'] as const;

function isValidBattery(value: string): boolean {
  if (value === '') return true;
  const kwh = Number(value);
  return Number.isFinite(kwh) && kwh >= 10 && kwh <= 200;
}

const schema = z.object({
  makeModel: z
    .string()
    .trim()
    .min(2, 'Enter the make and model')
    .max(60, 'Use 60 characters or fewer'),
  connector: z.enum(CONNECTORS, { error: 'Choose a connector type' }),
  batteryKwh: z.string().trim().refine(isValidBattery, 'Battery must be between 10 and 200 kWh'),
});

type FormValues = z.infer<typeof schema>;

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const snackbar = useSnackbar();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      makeModel: vehicle?.makeModel ?? '',
      connector: vehicle?.connector,
      batteryKwh: vehicle?.batteryKwh ? String(vehicle.batteryKwh) : '',
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const input = {
      makeModel: values.makeModel,
      connector: values.connector,
      batteryKwh: values.batteryKwh === '' ? null : Number(values.batteryKwh),
    };
    try {
      if (vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, input });
      } else {
        await createVehicle.mutateAsync(input);
      }
      snackbar.show(vehicle ? 'Vehicle updated' : 'Vehicle added');
      router.back();
    } catch (err) {
      setSubmitError(err);
    }
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="makeModel"
        render={({ field }) => (
          <AppTextInput
            label="Make and model"
            placeholder="Nissan Leaf"
            value={field.value}
            onChangeText={field.onChange}
            disabled={isSubmitting}
            error={errors.makeModel?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="connector"
        render={({ field }) => (
          <View style={styles.connectorField}>
            <Text variant="bodyLarge">Connector type</Text>
            <View style={styles.chips}>
              {CONNECTORS.map((connector) => (
                <ConnectorChip
                  key={connector}
                  connector={connector}
                  selected={field.value === connector}
                  onPress={() => field.onChange(connector)}
                />
              ))}
            </View>
            {errors.connector ? (
              <HelperText type="error">{errors.connector.message}</HelperText>
            ) : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="batteryKwh"
        render={({ field }) => (
          <AppTextInput
            label="Battery capacity in kWh (optional)"
            keyboardType="decimal-pad"
            value={field.value}
            onChangeText={(text) => field.onChange(text.replace(/[^0-9.]/g, ''))}
            disabled={isSubmitting}
            error={errors.batteryKwh?.message}
          />
        )}
      />
      {submitError ? <HelperText type="error">{errorMessage(submitError)}</HelperText> : null}
      <AppButton
        label={vehicle ? 'Save vehicle' : 'Add vehicle'}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  connectorField: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
