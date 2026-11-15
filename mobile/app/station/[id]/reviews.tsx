import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native-paper';
import { Card, EmptyState, ErrorView, LoadingView, RatingStars, Screen } from '@/components';
import { useReviews } from '@/features/reviews/hooks';
import { ReviewCard } from '@/features/reviews/ReviewCard';

export default function StationReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useReviews(id ?? '');
  const reviews = result.data ?? [];
  const count = reviews.length;
  const rating = count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0;

  return (
    <Screen
      title="Station reviews"
      back
      scroll
      refreshing={result.isRefetching}
      onRefresh={() => void result.refetch()}
    >
      {result.isPending && <LoadingView />}
      {result.isError && <ErrorView error={result.error} onRetry={() => void result.refetch()} />}
      {result.isSuccess && count === 0 && (
        <EmptyState
          icon="star-outline"
          title="No reviews yet"
          message="Reviews from completed charging sessions will appear here."
        />
      )}
      {count > 0 && (
        <>
          <Card title={`${rating.toFixed(1)} out of 5`}>
            <RatingStars value={Math.round(rating)} />
            <Text variant="bodyMedium">{count} {count === 1 ? 'review' : 'reviews'}</Text>
          </Card>
          {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
        </>
      )}
    </Screen>
  );
}
