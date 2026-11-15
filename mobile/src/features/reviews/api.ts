import { api } from '@/lib/api';
import type { Review } from '@/types/domain';

export type ReviewInput = { sessionId: string; rating: number; comment?: string };

export function listReviews(stationId: string): Promise<Review[]> {
  return api.get(`/stations/${encodeURIComponent(stationId)}/reviews`) as unknown as Promise<Review[]>;
}

export function addReview(input: ReviewInput): Promise<Review> {
  return api.post('/reviews', input) as unknown as Promise<Review>;
}
