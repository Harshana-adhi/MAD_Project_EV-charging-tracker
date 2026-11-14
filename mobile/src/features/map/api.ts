import { api as http } from '@/lib/api';
import type { StationDetail, StationFilters, StationSummary } from '@/types/domain';

export function listStations(filters: StationFilters): Promise<StationSummary[]> {
  return http.get('/stations', { params: filters }) as unknown as Promise<StationSummary[]>;
}

export function getStation(id: string): Promise<StationDetail> {
  return http.get(`/stations/${id}`) as unknown as Promise<StationDetail>;
}
