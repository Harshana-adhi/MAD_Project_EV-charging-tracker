import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import {
  AppButton,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  RatingStars,
  Screen,
  useSnackbar,
} from '@/components';
import { useDeleteOwnerReview, useOwnerReviews } from '@/features/owner';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { OwnerReview } from '@/types/domain';

export default function OwnerReviewsScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const reviews = useOwnerReviews();
  const deleteReview = useDeleteOwnerReview();
  const [stationId, setStationId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<OwnerReview | null>(null);

  const stations = useMemo(() => {
    const names = new Map<string, string>();
    (reviews.data ?? []).forEach((review) => names.set(review.stationId, review.stationName));
    return [...names.entries()];
  }, [reviews.data]);
  const visible = (reviews.data ?? []).filter((review) => !stationId || review.stationId === stationId);

  async function confirmDelete() {
    if (!toDelete) return;
    const review = toDelete;
    setToDelete(null);
    try {
      await deleteReview.mutateAsync(review.id);
      snackbar.show('Review deleted');
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
  }

  return (
    <Screen title="Station reviews" back scroll refreshing={reviews.isRefetching} onRefresh={() => void reviews.refetch()}>
      <View style={styles.content}>
        {reviews.isLoading ? <LoadingView message="Loading reviews…" /> : null}
        {reviews.isError ? <ErrorView error={reviews.error} onRetry={() => void reviews.refetch()} /> : null}
        {reviews.isSuccess && reviews.data.length === 0 ? (
          <EmptyState icon="star-outline" title="No reviews yet" message="Customer reviews of your stations will appear here." />
        ) : null}
        {stations.length > 1 ? (
          <View style={styles.chips}>
            <Chip selected={!stationId} onPress={() => setStationId(null)}>All stations</Chip>
            {stations.map(([id, name]) => (
              <Chip key={id} selected={stationId === id} onPress={() => setStationId(id)}>{name}</Chip>
            ))}
          </View>
        ) : null}
        {visible.map((review) => (
          <Card key={review.id} title={review.customerName} subtitle={`${review.stationName} · ${formatDate(review.createdAt)}`}>
            <View style={styles.body}>
              <RatingStars value={review.rating} size={16} />
              {review.comment ? <Text variant="bodyMedium">{review.comment}</Text> : null}
              <AppButton
                label="Delete review"
                icon="delete-outline"
                mode="text"
                danger
                onPress={() => setToDelete(review)}
                style={styles.delete}
              />
            </View>
          </Card>
        ))}
      </View>
      <ConfirmDialog
        visible={!!toDelete}
        title="Delete this review?"
        message={`The review from ${toDelete?.customerName ?? 'this customer'} will be removed from ${toDelete?.stationName ?? 'your station'}. They will be told it was removed.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => void confirmDelete()}
        onDismiss={() => setToDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { gap: spacing.sm },
  delete: { alignSelf: 'flex-end' },
});
