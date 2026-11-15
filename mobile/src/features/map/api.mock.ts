import { mockStationDetail, mockStationSummary } from '@/mocks/fixtures';
import { getMockStationReviews } from '@/mocks/reviews';
import type { StationDetail, StationFilters, StationSummary } from '@/types/domain';

function getMockRating(id: string) {
  const reviews = getMockStationReviews(id);
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    reviewCount: reviews.length,
    avgRating: reviews.length ? Math.round((total / reviews.length) * 10) / 10 : null,
  };
}

export async function listStations(filters: StationFilters): Promise<StationSummary[]> {
  if (filters.connector && !mockStationSummary.connectors.includes(filters.connector)) return [];
  return [{ ...mockStationSummary, ...getMockRating(mockStationSummary.id) }];
}

export async function getStation(id: string): Promise<StationDetail> {
  return { ...mockStationDetail, id, ...getMockRating(id) };
}
