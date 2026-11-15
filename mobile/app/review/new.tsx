import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { HelperText, Text } from 'react-native-paper';
import {
  AppButton,
  AppTextInput,
  EmptyState,
  ErrorView,
  LoadingView,
  RatingStars,
  Screen,
  useSnackbar,
} from '@/components';
import { useAuth } from '@/features/auth';
import { useAddReview } from '@/features/reviews/hooks';
import { useSession } from '@/features/session/hooks';
import { errorMessage } from '@/lib/errors';

const COMMENT_LIMIT = 300;

export default function WriteReviewScreen() {
  const { role, user, loading } = useAuth();
  const { sessionId, stationId } = useLocalSearchParams<{ stationId?: string; sessionId?: string }>();
  return (
    <Screen title="Write a review" back scroll>
      {loading ? (
        <LoadingView />
      ) : role !== 'customer' || !user ? (
        <EmptyState
          icon="star-outline"
          title="Customer account required"
          message="Sign in as a customer to review a completed charging session."
        />
      ) : sessionId && stationId ? (
        <ReviewForm
          key={`${user.id}:${sessionId}`}
          sessionId={sessionId}
          stationId={stationId}
          customerId={user.id}
        />
      ) : (
        <EmptyState
          icon="receipt-text-outline"
          title="Charging session required"
          message="Open your charging receipt and tap Rate this station."
        />
      )}
    </Screen>
  );
}

function ReviewForm({ sessionId, stationId, customerId }: {
  sessionId: string;
  stationId: string;
  customerId: string;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState(false);
  const snackbar = useSnackbar();
  const session = useSession(sessionId);
  const review = useAddReview();

  function returnToReceipt() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/receipt/[id]', params: { id: sessionId } });
  }

  async function submitReview() {
    if (!rating) {
      setRatingError(true);
      return;
    }

    try {
      await review.mutateAsync({ sessionId, rating, comment: comment.trim() || undefined });
      snackbar.show('Thanks for your review');
      returnToReceipt();
    } catch (error) {
      if (error instanceof Error && error.message === 'ALREADY_REVIEWED') {
        void session.refetch();
        snackbar.show(errorMessage(error));
        returnToReceipt();
      }
    }
  }

  if (session.isPending) return <LoadingView />;
  if (session.isError) return <ErrorView error={session.error} onRetry={() => void session.refetch()} />;

  const item = session.data;
  if (item.customerId !== customerId || item.stationId !== stationId || item.status !== 'completed') {
    return (
      <EmptyState
        icon="star-outline"
        title="Review unavailable"
        message="You can review a station after completing your own charging session there."
      />
    );
  }
  if (item.hasReview && !review.isPending) {
    return (
      <EmptyState
        icon="star-check-outline"
        title="Review already submitted"
        message="You can leave one review per charging session."
        actionLabel="Back to receipt"
        onAction={returnToReceipt}
      />
    );
  }

  return (
    <>
      <Text variant="titleLarge">{item.stationName}</Text>
      <RatingStars
        value={rating}
        disabled={review.isPending}
        onChange={(value) => {
          setRating(value);
          setRatingError(false);
        }}
      />
      {ratingError && <HelperText type="error">Choose a rating from 1 to 5 stars.</HelperText>}
      <AppTextInput
        label="Comment (optional)"
        value={comment}
        onChangeText={setComment}
        maxLength={COMMENT_LIMIT}
        editable={!review.isPending}
        multiline
        numberOfLines={3}
      />
      <HelperText type="info">{comment.length}/{COMMENT_LIMIT}</HelperText>
      {review.isError && <HelperText type="error">{errorMessage(review.error)}</HelperText>}
      <AppButton
        label="Submit review"
        onPress={() => void submitReview()}
        loading={review.isPending}
      />
    </>
  );
}
