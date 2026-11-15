import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Chip, Dialog, HelperText, Portal, Text } from 'react-native-paper';
import { AppTextInput } from '@/components';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';
import type { Charger, ChargerInput, ConnectorType } from '@/types/domain';

const CONNECTORS: ConnectorType[] = ['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT'];

function isInRange(value: string, min: number, max: number): boolean {
  if (!value.trim()) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

const schema = z.object({
  label: z.string().trim().min(1, 'Enter a charger label').max(30, 'Use 30 characters or fewer'),
  connector: z.enum(CONNECTORS, { error: 'Choose a connector type' }),
  powerKw: z.string().trim().refine((value) => isInRange(value, 3, 350), 'Power must be 3–350 kW'),
  ratePerKwh: z
    .string()
    .trim()
    .refine((value) => isInRange(value, 10, 500), 'Rate must be 10–500 credits per kWh'),
});

type FormValues = z.infer<typeof schema>;

type ChargerFormProps = {
  visible: boolean;
  charger?: Charger;
  loading?: boolean;
  onSubmit: (input: ChargerInput) => Promise<void>;
  onDismiss: () => void;
};

export function ChargerForm({ visible, charger, loading, onSubmit, onDismiss }: ChargerFormProps) {
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: charger?.label ?? '',
      connector: charger?.connector ?? 'TYPE2',
      powerKw: charger ? String(charger.powerKw) : '',
      ratePerKwh: charger ? String(charger.ratePerKwh) : '',
    },
  });

  useEffect(() => {
    reset({
      label: charger?.label ?? '',
      connector: charger?.connector ?? 'TYPE2',
      powerKw: charger ? String(charger.powerKw) : '',
      ratePerKwh: charger ? String(charger.ratePerKwh) : '',
    });
    setSubmitError(null);
  }, [charger?.id, reset, visible]);

  async function submit(values: FormValues) {
    setSubmitError(null);
    try {
      await onSubmit({
        label: values.label.trim(),
        connector: values.connector,
        powerKw: Number(values.powerKw),
        ratePerKwh: Number(values.ratePerKwh),
      });
    } catch (error) {
      setSubmitError(error);
    }
  }

  const busy = !!loading || isSubmitting;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={busy ? () => undefined : onDismiss}>
        <Dialog.Title>{charger ? 'Edit charger' : 'Add charger'}</Dialog.Title>
        <Dialog.Content>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Controller
              control={control}
              name="label"
              render={({ field }) => (
                <AppTextInput
                  label="Charger label"
                  placeholder="Charger A"
                  value={field.value}
                  onChangeText={field.onChange}
                  disabled={busy}
                  error={errors.label?.message}
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
                      <Chip
                        key={connector}
                        selected={field.value === connector}
                        disabled={busy}
                        onPress={() => field.onChange(connector)}
                      >
                        {connector}
                      </Chip>
                    ))}
                  </View>
                  {errors.connector ? <HelperText type="error">{errors.connector.message}</HelperText> : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="powerKw"
              render={({ field }) => (
                <AppTextInput
                  label="Power (kW)"
                  keyboardType="decimal-pad"
                  value={field.value}
                  onChangeText={(value) => field.onChange(value.replace(/[^0-9.]/g, ''))}
                  disabled={busy}
                  error={errors.powerKw?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="ratePerKwh"
              render={({ field }) => (
                <AppTextInput
                  label="Rate (credits per kWh)"
                  keyboardType="decimal-pad"
                  value={field.value}
                  onChangeText={(value) => field.onChange(value.replace(/[^0-9.]/g, ''))}
                  disabled={busy}
                  error={errors.ratePerKwh?.message}
                />
              )}
            />
            {submitError ? <HelperText type="error">{errorMessage(submitError)}</HelperText> : null}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={busy}>Cancel</Button>
          <Button onPress={() => { void handleSubmit(submit)(); }} loading={busy} disabled={busy}>
            {charger ? 'Save' : 'Add charger'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  connectorField: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
