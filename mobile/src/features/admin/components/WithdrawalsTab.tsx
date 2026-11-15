import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import {
  ConfirmDialog,
  Credits,
  EmptyState,
  ErrorView,
  LoadingView,
  useSnackbar,
} from '@/components';
import { errorMessage } from '@/lib/errors';
import { formatCredits, formatDate } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import type { AdminWithdrawal } from '@/types/domain';
import { useAdminWithdrawals, useProcessWithdrawal } from '../hooks';
import { ApprovalActions } from './ApprovalActions';

type PendingAction = { withdrawal: AdminWithdrawal; approve: boolean };

export function WithdrawalsTab() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { data: withdrawals, isLoading, isError, error, refetch, isRefetching } =
    useAdminWithdrawals('pending');
  const processWithdrawal = useProcessWithdrawal();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const secondaryText = { color: theme.colors.onSurfaceVariant };

  async function confirmAction() {
    if (!pendingAction) return;
    const { withdrawal, approve } = pendingAction;
    setPendingAction(null);
    try {
      await processWithdrawal.mutateAsync({ id: withdrawal.id, approve });
      snackbar.show(approve ? 'Withdrawal marked as paid' : 'Withdrawal rejected – credits returned');
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  function renderWithdrawal({ item }: { item: AdminWithdrawal }) {
    return (
      <Card mode="elevated" style={styles.card}>
        <Card.Content>
          <View style={styles.details}>
            <Text variant="titleMedium">{item.ownerName}</Text>
            <Credits amount={item.amount} />
            <Text variant="bodyMedium">{item.bankNote}</Text>
            <Text variant="bodySmall" style={secondaryText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <ApprovalActions
            approveLabel="Mark as paid"
            onApprove={() => setPendingAction({ withdrawal: item, approve: true })}
            onReject={() => setPendingAction({ withdrawal: item, approve: false })}
            disabled={processWithdrawal.isPending}
          />
        </Card.Content>
      </Card>
    );
  }

  if (isLoading) return <LoadingView />;
  if (isError || !withdrawals) return <ErrorView error={error} onRetry={refetch} />;

  const amountText = pendingAction ? formatCredits(pendingAction.withdrawal.amount) : '';
  const ownerName = pendingAction?.withdrawal.ownerName ?? '';

  return (
    <>
      <FlatList
        data={withdrawals}
        keyExtractor={(withdrawal) => withdrawal.id}
        renderItem={renderWithdrawal}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="bank-transfer"
            title="No pending withdrawals"
            message="Withdrawal requests from station owners will appear here."
          />
        }
      />

      <ConfirmDialog
        visible={!!pendingAction}
        title={pendingAction?.approve ? 'Mark as paid?' : 'Reject withdrawal?'}
        message={
          pendingAction?.approve
            ? `Confirm only after you have transferred ${amountText} to ${ownerName}.`
            : `${amountText} will be returned to ${ownerName}'s available credits.`
        }
        confirmLabel={pendingAction?.approve ? 'Mark as paid' : 'Reject'}
        danger={pendingAction ? !pendingAction.approve : false}
        onConfirm={confirmAction}
        onDismiss={() => setPendingAction(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  details: { gap: spacing.xs },
});
