import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionWithNames } from '@/types/domain';
import { addReview, listReviews } from './index';

export function useReviews(stationId: string) {
  return useQuery({
    queryKey: ['station-reviews', stationId],
    queryFn: () => listReviews(stationId),
    enabled: !!stationId,
  });
}

export function useAddReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addReview,
    onSuccess: (review, { sessionId }) => {
      queryClient.setQueryData<SessionWithNames>(['session', sessionId], (session) =>
        session ? { ...session, hasReview: true } : session,
      );
      void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['station-reviews', review.stationId] });
      void queryClient.invalidateQueries({ queryKey: ['station', review.stationId] });
      void queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}
