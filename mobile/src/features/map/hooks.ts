import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onEvent } from '@/lib/socket';
import type { StationDetail, StationFilters, StationSummary } from '@/types/domain';
import { api } from './index';

type ChargerStatusPayload = {
  chargerId: string;
  stationId: string;
  status: 'available' | 'busy' | 'offline';
  availableCount: number;
  onlineCount: number;
};

function useChargerStatusSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onEvent('charger:status', (payload) => {
      const { stationId, chargerId, status, availableCount, onlineCount } = payload as ChargerStatusPayload;

      // Set the server-computed counts directly rather than incrementing/decrementing –
      // without knowing each charger's previous status, a client-side +/-1 can't tell a
      // charger that just went offline apart from one that was already busy, and drifts.
      queryClient.setQueriesData<StationSummary[]>({ queryKey: ['stations'] }, (stations) =>
        stations?.map((station) =>
          station.id === stationId ? { ...station, availableCount, onlineCount } : station,
        ),
      );

      queryClient.setQueryData<StationDetail>(['station', stationId], (station) => {
        if (!station) return station;
        return {
          ...station,
          availableCount,
          onlineCount,
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
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onEvent('booking:changed', (payload) => {
        if ((payload as { stationId?: string }).stationId !== id) return;
        queryClient.invalidateQueries({ queryKey: ['station', id] });
      }),
    [queryClient, id],
  );

  return useQuery({
    queryKey: ['station', id],
    queryFn: () => api.getStation(id),
    enabled: !!id,
  });
}
