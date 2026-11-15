import { Text } from 'react-native-paper';
import { Card, RatingStars } from '@/components';
import { formatDate } from '@/lib/format';
import type { Review } from '@/types/domain';

export function ReviewCard({ review }: { review: Review }) {
  return (
    <Card title={review.customerName} subtitle={formatDate(review.createdAt)}>
      <RatingStars value={review.rating} size={16} />
      {review.comment ? <Text variant="bodyMedium">{review.comment}</Text> : null}
    </Card>
  );
}
