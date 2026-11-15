import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppButton } from '@/components';
import { formatCredits } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';

type ResultParams = {
  status: 'success' | 'failed';
  amount: string;
  balance?: string;
  reason?: string;
};

export default function PaymentResultScreen() {
  const theme = useAppTheme();
  const { status, amount, balance, reason } = useLocalSearchParams<ResultParams>();
  const succeeded = status === 'success';
  const value = Number(amount) || 0;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/wallet');
  }

  function tryAgain() {
    router.replace({ pathname: '/topup', params: { amount: String(value) } });
  }

  return (
    <Screen>
      <View style={styles.container}>
        <MaterialCommunityIcons
          name={succeeded ? 'check-circle' : 'alert-circle'}
          size={72}
          color={succeeded ? theme.colors.primary : theme.colors.error}
          accessibilityLabel={succeeded ? 'Payment successful' : 'Payment failed'}
        />
        <Text variant="headlineSmall" style={styles.centre}>
          {succeeded ? 'Payment successful' : 'Payment failed'}
        </Text>
        <Text
          variant="displaySmall"
          style={[
            styles.amount,
            { color: succeeded ? theme.colors.money.credit : theme.colors.onSurfaceVariant },
          ]}
        >
          {succeeded ? '+' : ''}
          {formatCredits(value)}
        </Text>

        {succeeded ? (
          balance ? (
            <Text variant="bodyLarge" style={[styles.centre, { color: theme.colors.onSurfaceVariant }]}>
              New available balance: {formatCredits(Number(balance))}
            </Text>
          ) : null
        ) : (
          <Text variant="bodyLarge" style={[styles.centre, { color: theme.colors.onSurfaceVariant }]}>
            {errorMessage(reason ?? 'SERVER_ERROR')} No credits were added.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {succeeded ? (
          <AppButton label="Done" onPress={goBack} />
        ) : (
          <>
            <AppButton label="Try again" onPress={tryAgain} />
            <AppButton label="Cancel" mode="text" onPress={goBack} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  centre: { textAlign: 'center' },
  amount: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  actions: { gap: spacing.sm },
});
