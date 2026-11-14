import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { Screen, Card, Credits, AppButton, LoadingView, ErrorView } from '@/components';
import { useMyWallet } from '@/features/wallet/hooks';
import { errorMessage } from '@/lib/errors';

export default function WalletScreen() {
  const { data: wallet, isLoading, isError, error, refetch } = useMyWallet();

  if (isLoading) return <LoadingView />;
  if (isError || !wallet) return <ErrorView message={errorMessage(error)} onRetry={refetch} />;

  return (
    <Screen scroll>
      <Card>
        <Text variant="labelLarge">Available balance</Text>
        <Credits amount={wallet.available} />
        <Text variant="bodySmall">Balance {wallet.balance} · Held {wallet.held}</Text>
      </Card>
      <AppButton label="Top up with card" onPress={() => router.push('/topup')} />
      <AppButton label="Top up with bank slip" mode="outlined" onPress={() => router.push('/topup-slip')} />
      <AppButton label="Transaction history" mode="text" onPress={() => router.push('/transactions')} />
    </Screen>
  );
}
