import type { Review } from '@/types/domain';
import { mockReview } from './fixtures';

const reviews: Review[] = [{ ...mockReview, customerName: 'Nimal P.' }];
const reviewedSessionIds = new Set<string>();

export function getMockStationReviews(stationId: string): Review[] {
  return reviews.filter((review) => review.stationId === stationId);
}

export function hasMockReview(sessionId: string): boolean {
  return reviewedSessionIds.has(sessionId);
}

export function saveMockReview(sessionId: string, review: Review): void {
  reviewedSessionIds.add(sessionId);
  reviews.unshift(review);
}
