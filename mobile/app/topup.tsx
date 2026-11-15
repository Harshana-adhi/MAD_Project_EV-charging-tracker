import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppTextInput, AppButton } from '@/components';
import { api as walletApi } from '@/features/wallet';
import { WALLET_QUERY_KEY } from '@/features/wallet/hooks';
import { formatCredits } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';

const schema = z.object({
  amount: z
    .number({ error: 'Enter an amount' })
    .int('Use whole credits')
    .min(100, 'Minimum top-up is LKR 100')
    .max(50000, 'Maximum top-up is LKR 50,000'),
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'Enter the 16-digit card number')),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY')
    .refine(isFutureExpiry, 'This card has expired'),
  cvv: z.string().regex(/^\d{3}$/, 'Enter the 3-digit CVV'),
  nameOnCard: z.string().trim().min(2, 'Enter the name on the card'),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function isFutureExpiry(value: string): boolean {
  const [month, year] = value.split('/').map(Number);
  const lastDayOfMonth = new Date(2000 + year, month, 0, 23, 59, 59);
  return lastDayOfMonth >= new Date();
}

function formatCardNumber(text: string): string {
  return text
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function TopUpScreen() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ amount?: string }>();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: Number(params.amount) || 1000,
      cardNumber: '',
      expiry: '',
      cvv: '',
      nameOnCard: '',
    },
  });

  const amount = watch('amount');

  async function onSubmit(values: FormValues) {
    try {
      const wallet = await walletApi.topUpWithCard({
        amount: values.amount,
        cardNumber: values.cardNumber,
      });
      queryClient.setQueryData(WALLET_QUERY_KEY, wallet);
      router.replace({
        pathname: '/payment-result',
        params: { status: 'success', amount: String(values.amount), balance: String(wallet.available) },
      });
    } catch (error) {
      router.replace({
        pathname: '/payment-result',
        params: {
          status: 'failed',
          amount: String(values.amount),
          reason: error instanceof Error ? error.message : 'SERVER_ERROR',
        },
      });
    }
  }

  return (
    <Screen title="Top up with card" back scroll>
      <View style={styles.form}>
        <View style={[styles.hint, { backgroundColor: theme.colors.tertiaryContainer }]}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={theme.colors.onTertiaryContainer}
          />
          <View style={styles.hintText}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer }}>
              Test mode – no real money is charged.
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer }}>
              Success: 4242 4242 4242 4242{'\n'}Declined: 4000 0000 0000 0002
            </Text>
          </View>
        </View>

        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <AppTextInput
              label="Amount (LKR)"
              keyboardType="number-pad"
              value={Number.isFinite(field.value) ? String(field.value) : ''}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '');
                field.onChange(digits ? Number(digits) : Number.NaN);
              }}
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
              keyboardType="number-pad"
              value={field.value}
              onChangeText={(text) => field.onChange(formatCardNumber(text))}
              error={errors.cardNumber?.message}
            />
          )}
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Controller
              control={control}
              name="expiry"
              render={({ field }) => (
                <AppTextInput
                  label="Expiry (MM/YY)"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={(text) => field.onChange(formatExpiry(text))}
                  error={errors.expiry?.message}
                />
              )}
            />
          </View>
          <View style={styles.rowItem}>
            <Controller
              control={control}
              name="cvv"
              render={({ field }) => (
                <AppTextInput
                  label="CVV"
                  keyboardType="number-pad"
                  secureTextEntry
                  value={field.value}
                  onChangeText={(text) => field.onChange(text.replace(/\D/g, '').slice(0, 3))}
                  error={errors.cvv?.message}
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="nameOnCard"
          render={({ field }) => (
            <AppTextInput
              label="Name on card"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.nameOnCard?.message}
            />
          )}
        />

        <AppButton
          label={Number.isFinite(amount) && amount > 0 ? `Pay ${formatCredits(amount)}` : 'Pay'}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  hint: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 12 },
  hintText: { flex: 1, gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
});
