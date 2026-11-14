import { mockStationDetail, mockStationSummary } from '@/mocks/fixtures';
import type { StationDetail, StationFilters, StationSummary } from '@/types/domain';

export async function listStations(filters: StationFilters): Promise<StationSummary[]> {
  if (filters.connector && !mockStationSummary.connectors.includes(filters.connector)) return [];
  return [mockStationSummary];
}

export async function getStation(id: string): Promise<StationDetail> {
  return { ...mockStationDetail, id };
}
