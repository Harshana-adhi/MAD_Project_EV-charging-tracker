import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import type { SessionWithNames, StationSummary } from '@/types/domain';
import { addReview, listFavourites, listReviews, toggleFavourite } from './index';

export function useFavourites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favourites', user?.id],
    queryFn: listFavourites,
    enabled: user?.role === 'customer',
  });
}

export function useToggleFavourite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['favourites', user?.id];
  return useMutation({
    mutationFn: (station: StationSummary) => toggleFavourite(station.id),
    onSuccess: ({ favourite }, station) => {
      queryClient.setQueryData<StationSummary[]>(queryKey, (current) => {
        if (!current) return current;
        const others = current.filter(({ id }) => id !== station.id);
        return favourite ? [station, ...others] : others;
      });
    },
    onSettled: (_data, _error, station) => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ['station', station.id] });
    },
  });
}

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
      void queryClient.invalidateQueries({ queryKey: ['favourites'] });
    },
  });
}
