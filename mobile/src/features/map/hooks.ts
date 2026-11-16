import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onEvent } from '@/lib/socket';
import type { StationDetail, StationFilters, StationSummary } from '@/types/domain';
import { api } from './index';

type ChargerStatusPayload = {
  chargerId: string;
  stationId: string;
  status: 'available' | 'busy' | 'offline' | 'walkin';
  busyUntil?: string | null;
  availableCount: number;
  onlineCount: number;
};

function useChargerStatusSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onEvent('charger:status', (payload) => {
      const { stationId, chargerId, status, busyUntil, availableCount, onlineCount } = payload as ChargerStatusPayload;

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
            charger.id === chargerId ? { ...charger, status, busyUntil: busyUntil ?? null } : charger,
          ),
        };
      });
    });
  }, [queryClient]);

  // Events sent while the app was offline or in the background are gone, so refetch when the
  // socket (re)connects instead of trusting what was cached.
  useEffect(() => {
    return onEvent('connect', () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['station'] });
      queryClient.invalidateQueries({ queryKey: ['station-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    });
  }, [queryClient]);

  // A station an owner deleted or an admin hid must leave the map and lists straight away.
  useEffect(() => {
    return onEvent('station:changed', (payload) => {
      const { stationId } = payload as { stationId: string };
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['station', stationId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
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
