import { getCurrentMockUser } from '@/mocks/currentUser';
import { mockStationDetail } from '@/mocks/fixtures';
import { getMockStationReviews, hasMockReview, saveMockReview } from '@/mocks/reviews';
import { getSession } from '@/features/session/api.mock';
import type { Review } from '@/types/domain';
import type { ReviewInput } from './api';

export async function listReviews(stationId: string): Promise<Review[]> {
  if (stationId !== mockStationDetail.id || mockStationDetail.status !== 'approved') {
    throw new Error('NOT_FOUND');
  }
  return getMockStationReviews(stationId);
}

export async function addReview({ sessionId, rating, comment }: ReviewInput): Promise<Review> {
  const customer = getCurrentMockUser();
  if (customer.role !== 'customer') throw new Error('NOT_ALLOWED');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || (comment?.length ?? 0) > 300) {
    throw new Error('VALIDATION_ERROR');
  }

  const session = await getSession(sessionId);
  if (session.customerId !== customer.id || session.status !== 'completed') {
    throw new Error('NOT_ALLOWED');
  }
  if (hasMockReview(sessionId)) throw new Error('ALREADY_REVIEWED');

  const names = customer.fullName.trim().split(/\s+/);
  const lastName = names.length > 1 ? names[names.length - 1] : undefined;
  const review: Review = {
    id: `mock-review-${sessionId}`,
    stationId: session.stationId,
    customerName: lastName ? `${names[0]} ${lastName[0]}.` : names[0],
    rating,
    comment: comment?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  saveMockReview(sessionId, review);
  return review;
}
