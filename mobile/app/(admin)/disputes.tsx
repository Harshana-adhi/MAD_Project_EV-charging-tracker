import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { AppButton, ConfirmDialog, EmptyState, ErrorView, LoadingView, Screen, useSnackbar } from '@/components';
import { useAdminDisputes, useResolveDispute } from '@/features/admin/hooks';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';
import { errorMessage } from '@/lib/errors';
import { formatCredits, formatDate, formatKwh } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { AdminDispute } from '@/types/domain';

// Sessions an owner has disputed. Closing one puts the session back to completed and tells
// the owner and the customer; it does not move any money.
export default function AdminDisputesScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { data: disputes, isLoading, isError, error, refetch } = useAdminDisputes();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const resolveDispute = useResolveDispute();
  const [toClose, setToClose] = useState<AdminDispute | null>(null);
  const secondaryText = { color: theme.colors.onSurfaceVariant };

  async function confirmClose() {
    if (!toClose) return;
    const dispute = toClose;
    setToClose(null);
    try {
      await resolveDispute.mutateAsync(dispute.id);
      snackbar.show('Dispute closed');
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  if (isLoading) return <LoadingView />;
  if (isError || !disputes) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <Screen>
      <FlatList
        data={disputes}
        keyExtractor={(dispute) => dispute.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <Card mode="elevated" style={styles.card}>
            <Card.Content>
              <View style={styles.details}>
                <Text variant="titleMedium">
                  {item.stationName} · {item.chargerLabel}
                </Text>
                <Text variant="bodyMedium">Owner: {item.ownerName}</Text>
                <Text variant="bodyMedium">Customer: {item.customerName}</Text>
                <Text variant="bodyMedium">
                  {item.kwh !== null ? formatKwh(item.kwh) : '—'} · {item.cost !== null ? formatCredits(item.cost) : '—'}
                </Text>
                {item.endedAt ? (
                  <Text variant="bodySmall" style={secondaryText}>
                    Ended {formatDate(item.endedAt)}
                  </Text>
                ) : null}
                <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                  Reason: {item.reason ?? 'No reason given'}
                </Text>
              </View>
              <AppButton
                label="Close dispute"
                mode="contained-tonal"
                disabled={resolveDispute.isPending}
                onPress={() => setToClose(item)}
              />
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="alert-circle-outline"
            title="No open disputes"
            message="Sessions that a station owner disputes will appear here."
          />
        }
      />
      <ConfirmDialog
        visible={!!toClose}
        title="Close dispute?"
        message="The session goes back to completed and the owner and the customer are told. No money is moved."
        confirmLabel="Close dispute"
        onConfirm={() => void confirmClose()}
        onDismiss={() => setToClose(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  details: { gap: spacing.xs, marginBottom: spacing.md },
});
