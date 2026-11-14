import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native-paper';
import { Screen, AppButton } from '@/components';
import { formatCredits } from '@/lib/format';

export default function PaymentResultScreen() {
  const { status, amount } = useLocalSearchParams<{ status: string; amount: string }>();
  const succeeded = status === 'success';

  return (
    <Screen>
      <Text variant="headlineSmall">{succeeded ? 'Payment successful' : 'Payment failed'}</Text>
      <Text variant="bodyLarge">{formatCredits(Number(amount) || 0)}</Text>
      <AppButton label="Back to wallet" onPress={() => router.replace('/(customer)/wallet')} />
    </Screen>
  );
}
