import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Card, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import type { AdminTopup } from '@/types/domain';
import { useAdminTopups, useReviewTopup } from '../hooks';
import { ApprovalActions } from './ApprovalActions';
import { ReasonDialog } from './ReasonDialog';

const THUMBNAIL_SIZE = 64;

export function TopupsTab() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { data: topups, isLoading, isError, error, refetch, isRefetching } =
    useAdminTopups('pending');
  const reviewTopup = useReviewTopup();
  const [topupToApprove, setTopupToApprove] = useState<AdminTopup | null>(null);
  const [topupToReject, setTopupToReject] = useState<AdminTopup | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const secondaryText = { color: theme.colors.onSurfaceVariant };

  async function review(topup: AdminTopup, approve: boolean, reason?: string) {
    setTopupToApprove(null);
    setTopupToReject(null);
    try {
      await reviewTopup.mutateAsync({ id: topup.id, input: { approve, reason } });
      snackbar.show(approve ? 'Top-up approved – credits added' : 'Top-up rejected');
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  function renderTopup({ item }: { item: AdminTopup }) {
    return (
      <Card mode="elevated" style={styles.card}>
        <Card.Content>
          <View style={styles.row}>
            {item.slipUrl ? (
              <Pressable
                onPress={() => setSlipUrl(item.slipUrl)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`View bank slip from ${item.userName}`}
              >
                <Image source={{ uri: item.slipUrl }} style={styles.thumbnail} />
              </Pressable>
            ) : (
              <View
                style={[
                  styles.thumbnail,
                  styles.placeholder,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <MaterialCommunityIcons
                  name="bank-transfer"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}
            <View style={styles.details}>
              <Text variant="titleMedium">{item.userName}</Text>
              <Credits amount={item.amount} />
              <Text variant="bodySmall" style={secondaryText}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <ApprovalActions
            approveLabel="Approve"
            onApprove={() => setTopupToApprove(item)}
            onReject={() => setTopupToReject(item)}
            disabled={reviewTopup.isPending}
          />
        </Card.Content>
      </Card>
    );
  }

  if (isLoading) return <LoadingView />;
  if (isError || !topups) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <>
      <FlatList
        data={topups}
        keyExtractor={(topup) => topup.id}
        renderItem={renderTopup}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            icon="cash-check"
            title="No pending top-ups"
            message="Bank slip top-up requests from customers will appear here."
          />
        }
      />

      <ConfirmDialog
        visible={!!topupToApprove}
        title="Approve top-up?"
        message={
          topupToApprove
            ? `${formatCredits(topupToApprove.amount)} will be added to ${topupToApprove.userName}'s wallet.`
            : ''
        }
        confirmLabel="Approve"
        onConfirm={() => topupToApprove && review(topupToApprove, true)}
        onDismiss={() => setTopupToApprove(null)}
      />
      {topupToReject ? (
        <ReasonDialog
          title="Reject top-up?"
          message={`Tell ${topupToReject.userName} why the slip was rejected.`}
          onSubmit={(reason) => review(topupToReject, false, reason)}
          onDismiss={() => setTopupToReject(null)}
        />
      ) : null}

      <Portal>
        <Modal
          visible={!!slipUrl}
          onDismiss={() => setSlipUrl(null)}
          contentContainerStyle={styles.slipModal}
        >
          {slipUrl ? (
            <Image
              source={{ uri: slipUrl }}
              style={styles.slipImage}
              resizeMode="contain"
              accessibilityLabel="Bank slip"
            />
          ) : null}
          <IconButton
            icon="close"
            mode="contained"
            style={styles.closeButton}
            accessibilityLabel="Close bank slip"
            onPress={() => setSlipUrl(null)}
          />
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  thumbnail: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: spacing.sm },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, gap: spacing.xs },
  slipModal: { flex: 1, margin: spacing.lg },
  slipImage: { flex: 1 },
  closeButton: { position: 'absolute', top: spacing.sm, right: spacing.sm },
});
