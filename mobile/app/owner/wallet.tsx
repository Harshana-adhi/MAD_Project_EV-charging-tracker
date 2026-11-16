import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppButton, AppTextInput, Card, ConfirmDialog, EmptyState, ErrorView, LoadingView, Screen, StatusBadge, useSnackbar } from '@/components';
import { useOwnerWallet, useOwnerWithdrawals, useRequestWithdrawal } from '@/features/owner';
import { errorMessage } from '@/lib/errors';
import { formatCredits, formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';

export default function OwnerWalletScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const wallet = useOwnerWallet();
  const withdrawals = useOwnerWithdrawals();
  const request = useRequestWithdrawal();
  const [amountText, setAmountText] = useState('');
  const [bankNote, setBankNote] = useState('');
  const [error, setError] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const refreshing = wallet.isRefetching || withdrawals.isRefetching;

  function validateForm(): number | null {
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 500) {
      setError('The minimum withdrawal is 500 credits.');
      return null;
    }
    if (Math.round(amount * 100) !== amount * 100) {
      setError('Amount can have at most two decimal places.');
      return null;
    }
    if (!wallet.data || amount > wallet.data.available) {
      setError('The requested amount exceeds your available balance.');
      return null;
    }
    if (bankNote.trim().length < 5 || bankNote.trim().length > 200) {
      setError('Enter bank and account details in 5–200 characters.');
      return null;
    }
    setError('');
    return amount;
  }

  async function confirmRequest() {
    const amount = validateForm();
    if (amount === null) {
      setConfirmVisible(false);
      return;
    }
    try {
      await request.mutateAsync({ amount, bankNote: bankNote.trim() });
      setConfirmVisible(false);
      setAmountText('');
      setBankNote('');
      snackbar.show('Withdrawal request submitted');
    } catch (requestError) {
      setError(errorMessage(requestError));
      setConfirmVisible(false);
    }
  }

  return (
    <Screen title="Owner wallet" back scroll refreshing={refreshing} onRefresh={() => void Promise.all([wallet.refetch(), withdrawals.refetch()])}>
      <View style={styles.content}>
        {wallet.isLoading ? <LoadingView message="Loading wallet…" /> : null}
        {wallet.isError ? <ErrorView error={wallet.error} onRetry={() => void wallet.refetch()} /> : null}
        {wallet.data ? (
          <Card title="Wallet balance">
            <View style={styles.balanceRows}>
              <BalanceRow label="Balance" value={wallet.data.balance} primary />
              <BalanceRow label="Held" value={wallet.data.held} />
              <BalanceRow label="Available to withdraw" value={wallet.data.available} primary />
            </View>
          </Card>
        ) : null}

        <Card title="Request a withdrawal" subtitle="Minimum 500 credits · requests are reviewed by an administrator">
          <AppTextInput
            label="Amount (credits)"
            value={amountText}
            onChangeText={(value) => { setAmountText(value); setError(''); }}
            keyboardType="decimal-pad"
            error={error && (amountText.length === 0 || Number(amountText) < 500 || Number(amountText) > (wallet.data?.available ?? 0)) ? error : undefined}
          />
          <AppTextInput
            label="Bank name, branch and account details"
            value={bankNote}
            onChangeText={(value) => { setBankNote(value); setError(''); }}
            multiline
            numberOfLines={3}
            maxLength={200}
            error={error && bankNote.trim().length < 5 ? error : undefined}
          />
          {error ? <Text variant="bodySmall" style={{ color: theme.colors.error }}>{error}</Text> : null}
          <AppButton label="Review request" icon="bank-transfer" onPress={() => { if (validateForm() !== null) setConfirmVisible(true); }} />
        </Card>

        <Card title="Withdrawal history">
          {withdrawals.isLoading ? <LoadingView message="Loading requests…" /> : null}
          {withdrawals.isError ? <ErrorView error={withdrawals.error} onRetry={() => void withdrawals.refetch()} /> : null}
          {withdrawals.isSuccess && withdrawals.data.length === 0 ? (
            <EmptyState icon="bank-outline" title="No requests yet" message="Your withdrawal requests and their review status will appear here." />
          ) : null}
          {withdrawals.data?.map((item) => (
            <View key={item.id} style={[styles.withdrawalRow, { borderBottomColor: theme.colors.outlineVariant }]}>
              <View style={styles.withdrawalInfo}>
                <Text variant="titleSmall">{formatCredits(item.amount)}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(item.createdAt)}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>{item.bankNote}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
          ))}
        </Card>
      </View>
      <ConfirmDialog
        visible={confirmVisible}
        title="Confirm withdrawal request"
        message={`Request ${formatCredits(Number(amountText) || 0)}? This amount will be held until the administrator processes the request.`}
        confirmLabel="Submit request"
        onConfirm={() => void confirmRequest()}
        onDismiss={() => setConfirmVisible(false)}
      />
    </Screen>
  );
}

function BalanceRow({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.balanceRow}>
      <Text variant="bodyMedium">{label}</Text>
      <Text variant="titleMedium" style={{ color: primary ? theme.colors.primary : theme.colors.onSurface, fontVariant: ['tabular-nums'] }}>
        {formatCredits(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  balanceRows: { gap: spacing.md },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  withdrawalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  withdrawalInfo: { flex: 1, gap: spacing.xs },
});
