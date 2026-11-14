import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native-paper';
import { Screen, AppTextInput, AppButton } from '@/components';
import { api as walletApi } from '@/features/wallet';

const schema = z.object({
  amount: z.number().int().min(100).max(50000),
  cardNumber: z.string().min(1, 'Card number is required'),
});

type FormValues = z.infer<typeof schema>;

export default function TopUpScreen() {
  const params = useLocalSearchParams<{ amount?: string }>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: Number(params.amount) || 1000, cardNumber: '4242 4242 4242 4242' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await walletApi.topUpWithCard(values);
      router.replace({ pathname: '/payment-result', params: { status: 'success', amount: String(values.amount) } });
    } catch {
      router.replace({ pathname: '/payment-result', params: { status: 'failed', amount: String(values.amount) } });
    }
  }

  return (
    <Screen scroll>
      <Text variant="headlineSmall">Top up with card</Text>
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <AppTextInput
            label="Amount (credits)"
            keyboardType="numeric"
            value={String(field.value)}
            onChangeText={(text) => field.onChange(Number(text))}
            error={errors.amount?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cardNumber"
        render={({ field }) => (
          <AppTextInput
            label="Card number"
            keyboardType="numeric"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.cardNumber?.message}
          />
        )}
      />
      <AppButton label="Pay" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </Screen>
  );
}
