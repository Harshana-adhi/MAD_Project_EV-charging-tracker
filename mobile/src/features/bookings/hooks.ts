import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onEvent } from '@/lib/socket';
import { api } from './index';

type BookingChangedPayload = { chargerId: string; stationId: string; date: string };

export function useStationBookings(stationId: string, date: string) {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onEvent('booking:changed', (payload) => {
        const { stationId: changedStationId, date: changedDate } = payload as BookingChangedPayload;
        if (changedStationId !== stationId || changedDate !== date) return;
        queryClient.invalidateQueries({ queryKey: ['station-bookings', stationId, date] });
      }),
    [queryClient, stationId, date],
  );

  return useQuery({
    queryKey: ['station-bookings', stationId, date],
    queryFn: () => api.listStationBookings(stationId, date),
    enabled: !!stationId && !!date,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useMyBookings() {
  return useQuery({ queryKey: ['my-bookings'], queryFn: api.listMyBookings });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['station-bookings'] });
    },
  });
}

export function useOwnerBookings() {
  return useQuery({ queryKey: ['owner-bookings'], queryFn: api.listOwnerBookings });
}
