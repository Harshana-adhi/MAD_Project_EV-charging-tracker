import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChargerInput, StationInput } from '@/types/domain';
import { onEvent } from '@/lib/socket';
import { USE_MOCKS } from '@/lib/config';
import { WALLET_QUERY_KEY } from '@/features/wallet/hooks';
import * as walletApi from '@/features/wallet/api';
import type { OwnerPhotoUpload } from './api';
import { getOwnerWallet } from './api.mock';
import { api } from './client';

export const OWNER_STATIONS_QUERY_KEY = ['owner', 'stations'];
export const OWNER_SESSIONS_QUERY_KEY = ['owner', 'sessions'];
export const OWNER_WITHDRAWALS_QUERY_KEY = ['owner', 'withdrawals'];

export function useOwnerWallet() {
  const queryClient = useQueryClient();
  useEffect(() => {
    return onEvent('wallet:updated', () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: () => (USE_MOCKS ? getOwnerWallet() : walletApi.getMyWallet()),
  });
}

export function useOwnerStations() {
  const queryClient = useQueryClient();
  useEffect(() => {
    return onEvent('charger:status', () => {
      queryClient.invalidateQueries({ queryKey: OWNER_STATIONS_QUERY_KEY });
    });
  }, [queryClient]);
  useEffect(() => {
    return onEvent('notification:new', (payload) => {
      if (
        payload &&
        typeof payload === 'object' &&
        'type' in payload &&
        (payload as { type?: unknown }).type === 'station_review'
      ) {
        queryClient.invalidateQueries({ queryKey: OWNER_STATIONS_QUERY_KEY });
      }
    });
  }, [queryClient]);

  return useQuery({ queryKey: OWNER_STATIONS_QUERY_KEY, queryFn: api.listMyStations });
}

function useRefreshOwnerStations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: OWNER_STATIONS_QUERY_KEY });
}

export function useCreateStation() {
  const refresh = useRefreshOwnerStations();
  return useMutation({ mutationFn: (input: StationInput) => api.createStation(input), onSettled: refresh });
}

export function useUpdateStation() {
  const refresh = useRefreshOwnerStations();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StationInput> }) =>
      api.updateStation(id, input),
    onSettled: refresh,
  });
}

export function useUploadStationPhoto() {
  const refresh = useRefreshOwnerStations();
  return useMutation({
    mutationFn: ({ id, photo }: { id: string; photo: OwnerPhotoUpload }) =>
      api.uploadStationPhoto(id, photo),
    onSettled: refresh,
  });
}

export function useCreateCharger() {
  const refresh = useRefreshOwnerStations();
  return useMutation({
    mutationFn: ({ stationId, input }: { stationId: string; input: ChargerInput }) =>
      api.createCharger(stationId, input),
    onSettled: refresh,
  });
}

export function useUpdateCharger() {
  const refresh = useRefreshOwnerStations();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ChargerInput> }) =>
      api.updateCharger(id, input),
    onSettled: refresh,
  });
}

export function useDeleteCharger() {
  const refresh = useRefreshOwnerStations();
  return useMutation({ mutationFn: (id: string) => api.deleteCharger(id), onSettled: refresh });
}

export function useDeleteStation() {
  const refresh = useRefreshOwnerStations();
  return useMutation({ mutationFn: (id: string) => api.deleteStation(id), onSettled: refresh });
}

export function useSetChargerStatus() {
  const refresh = useRefreshOwnerStations();
  return useMutation({
    mutationFn: ({
      id,
      status,
      busyUntil,
    }: {
      id: string;
      status: 'available' | 'offline' | 'walkin';
      busyUntil?: string;
    }) => api.setChargerStatus(id, status, busyUntil),
    onSettled: refresh,
  });
}

export function useOwnerSessions() {
  const queryClient = useQueryClient();
  useEffect(() => {
    return onEvent('session:updated', () => {
      queryClient.invalidateQueries({ queryKey: OWNER_SESSIONS_QUERY_KEY });
    });
  }, [queryClient]);
  return useQuery({ queryKey: OWNER_SESSIONS_QUERY_KEY, queryFn: api.listOwnerSessions });
}

export function useDisputeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.disputeSession(id, reason),
    onSettled: () => queryClient.invalidateQueries({ queryKey: OWNER_SESSIONS_QUERY_KEY }),
  });
}

export function useOwnerEarnings(from: string, to: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    return onEvent('session:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'earnings'] });
    });
  }, [queryClient]);
  return useQuery({
    queryKey: ['owner', 'earnings', from, to],
    queryFn: () => api.getOwnerEarnings(from, to),
    enabled: Boolean(from && to),
  });
}

export function useOwnerReviews() {
  return useQuery({ queryKey: ['owner', 'reviews'], queryFn: api.listOwnerReviews });
}

export function useDeleteOwnerReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteOwnerReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['station'] });
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}

export function useStationEarnings(from: string, to: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    return onEvent('session:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'station-earnings'] });
    });
  }, [queryClient]);
  return useQuery({
    queryKey: ['owner', 'station-earnings', from, to],
    queryFn: () => api.getStationEarnings(from, to),
    enabled: Boolean(from && to),
  });
}

export function useOwnerWithdrawals() {
  const queryClient = useQueryClient();
  useEffect(() => {
    return onEvent('notification:new', (payload) => {
      if (
        payload &&
        typeof payload === 'object' &&
        'type' in payload &&
        (payload as { type?: unknown }).type === 'withdrawal_review'
      ) {
        queryClient.invalidateQueries({ queryKey: OWNER_WITHDRAWALS_QUERY_KEY });
      }
    });
  }, [queryClient]);
  return useQuery({ queryKey: OWNER_WITHDRAWALS_QUERY_KEY, queryFn: api.listMyWithdrawals });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: number; bankNote: string }) => api.requestWithdrawal(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: OWNER_WITHDRAWALS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
    },
  });
}
