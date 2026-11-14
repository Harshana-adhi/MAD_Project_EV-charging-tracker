import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppButton, LoadingView, ErrorView } from '@/components';
import { useMyWallet } from '@/features/wallet/hooks';
import { useAppTheme, spacing } from '@/lib/theme';
import { formatCredits } from '@/lib/format';

const QUICK_AMOUNTS = [500, 1000, 2000];

export default function WalletScreen() {
  const theme = useAppTheme();
  const { data: wallet, isLoading, isError, error, refetch, isRefetching } = useMyWallet();

  if (isLoading) return <LoadingView />;
  if (isError || !wallet) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons
          name="leaf"
          size={20}
          color={theme.colors.onPrimaryContainer}
          style={styles.leaf}
        />
        <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
          Available balance
        </Text>
        <Text
          variant="displaySmall"
          style={[styles.balance, { color: theme.colors.onPrimaryContainer }]}
        >
          {formatCredits(wallet.available)}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
          Held: {formatCredits(wallet.held)} (reserved for active charging or withdrawal)
        </Text>
      </View>

      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((amount) => (
          <AppButton
            key={amount}
            label={`+${amount.toLocaleString('en-US')}`}
            style={styles.quickButton}
            mode="contained-tonal"
            onPress={() => router.push({ pathname: '/topup', params: { amount: String(amount) } })}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton label="Top up with card" onPress={() => router.push('/topup')} />
        <AppButton
          label="Pay by bank slip"
          mode="outlined"
          onPress={() => router.push('/topup-slip')}
        />
        <AppButton
          label="Transaction history"
          mode="text"
          onPress={() => router.push('/transactions')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg },
  leaf: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  balance: { fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickButton: { flex: 1 },
  actions: { gap: spacing.md },
});
