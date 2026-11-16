import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
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
  const [toDelete, setToDelete] = useState<OwnerReview | null>(null);

  const groups = useMemo(() => {
    const byStation = new Map<string, { name: string; reviews: OwnerReview[] }>();
    (reviews.data ?? []).forEach((review) => {
      const group = byStation.get(review.stationId) ?? { name: review.stationName, reviews: [] };
      group.reviews.push(review);
      byStation.set(review.stationId, group);
    });
    return [...byStation.entries()]
      .map(([id, group]) => ({
        id,
        name: group.name,
        reviews: group.reviews,
        average: group.reviews.reduce((sum, review) => sum + review.rating, 0) / group.reviews.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reviews.data]);

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
        {groups.map((group) => (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text variant="titleMedium" style={styles.groupName}>{group.name}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {group.average.toFixed(1)} ★ · {group.reviews.length} {group.reviews.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
            {group.reviews.map((review) => (
              <Card key={review.id} title={review.customerName} subtitle={formatDate(review.createdAt)}>
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
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  groupName: { flex: 1 },
  body: { gap: spacing.sm },
  delete: { alignSelf: 'flex-end' },
});
