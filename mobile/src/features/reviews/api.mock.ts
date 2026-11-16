import { getCurrentMockUser } from '@/mocks/currentUser';
import { mockStationDetail } from '@/mocks/fixtures';
import { getMockStationReviews, hasMockReview, saveMockReview } from '@/mocks/reviews';
import { listStations } from '@/features/map/api.mock';
import { getSession } from '@/features/session/api.mock';
import type { Review, StationSummary } from '@/types/domain';
import type { ReviewInput } from './api';

const mockFavourites = new Map<string, Set<string>>();

function getSavedStationIds() {
  const user = getCurrentMockUser();
  if (user.role !== 'customer') throw new Error('NOT_ALLOWED');

  const saved = mockFavourites.get(user.id) ?? new Set<string>();
  mockFavourites.set(user.id, saved);
  return saved;
}

export async function listFavourites(): Promise<StationSummary[]> {
  const saved = getSavedStationIds();
  const stations = await listStations({});
  return stations.filter((station) => station.status === 'approved' && saved.has(station.id));
}

export async function toggleFavourite(stationId: string): Promise<{ favourite: boolean }> {
  const saved = getSavedStationIds();
  const stations = await listStations({});
  if (!stations.some(({ id, status }) => id === stationId && status === 'approved')) {
    throw new Error('NOT_FOUND');
  }
  if (saved.delete(stationId)) return { favourite: false };
  saved.add(stationId);
  return { favourite: true };
}

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
