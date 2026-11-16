import { api } from '@/lib/api';
import type { Review, StationSummary } from '@/types/domain';

export type ReviewInput = { sessionId: string; rating: number; comment?: string };

export function listReviews(stationId: string): Promise<Review[]> {
  return api.get(`/stations/${encodeURIComponent(stationId)}/reviews`) as unknown as Promise<Review[]>;
}

export function addReview(input: ReviewInput): Promise<Review> {
  return api.post('/reviews', input) as unknown as Promise<Review>;
}

export function listFavourites(): Promise<StationSummary[]> {
  return api.get('/favourites') as unknown as Promise<StationSummary[]>;
}

export function toggleFavourite(stationId: string): Promise<{ favourite: boolean }> {
  return api.post(`/favourites/${encodeURIComponent(stationId)}`) as unknown as Promise<{
    favourite: boolean;
  }>;
}
