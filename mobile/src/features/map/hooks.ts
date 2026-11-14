import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onEvent } from '@/lib/socket';
import type { StationDetail, StationFilters, StationSummary } from '@/types/domain';
import { api } from './index';

type ChargerStatusPayload = { chargerId: string; stationId: string; status: 'available' | 'busy' | 'offline' };

function useChargerStatusSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onEvent('charger:status', (payload) => {
      const { stationId, chargerId, status } = payload as ChargerStatusPayload;

      queryClient.setQueriesData<StationSummary[]>({ queryKey: ['stations'] }, (stations) =>
        stations?.map((station) =>
          station.id === stationId
            ? { ...station, availableCount: status === 'available' ? station.availableCount + 1 : Math.max(0, station.availableCount - 1) }
            : station,
        ),
      );

      queryClient.setQueryData<StationDetail>(['station', stationId], (station) => {
        if (!station) return station;
        return {
          ...station,
          chargers: station.chargers.map((charger) =>
            charger.id === chargerId ? { ...charger, status } : charger,
          ),
        };
      });
    });
  }, [queryClient]);
}

export function useStations(filters: StationFilters) {
  useChargerStatusSync();
  return useQuery({
    queryKey: ['stations', filters],
    queryFn: () => api.listStations(filters),
  });
}

export function useStation(id: string) {
  useChargerStatusSync();
  return useQuery({
    queryKey: ['station', id],
    queryFn: () => api.getStation(id),
    enabled: !!id,
  });
}
