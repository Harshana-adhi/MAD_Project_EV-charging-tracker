import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onEvent } from '@/lib/socket';
import type { RequestStatus, StationStatus, WithdrawalStatus } from '@/types/domain';
import type { ReviewInput } from './api';
import { api } from './index';

const ADMIN_QUERY_KEY = ['admin'];

// Every approval changes a list and the dashboard counts, so all admin data is refreshed together.
function useRefreshAdminData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
}

export function useAdminCounts() {
  const queryClient = useQueryClient();

  // New stations, slips and withdrawals reach admins as notifications, so the counts stay live.
  useEffect(() => {
    return onEvent('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
    });
  }, [queryClient]);

  return useQuery({ queryKey: ['admin', 'counts'], queryFn: api.getAdminCounts });
}

export function useAdminStations(status: StationStatus) {
  return useQuery({
    queryKey: ['admin', 'stations', status],
    queryFn: () => api.listStationsByStatus(status),
  });
}

export function useReviewStation() {
  const queryClient = useQueryClient();
  const refresh = useRefreshAdminData();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewInput }) => api.reviewStation(id, input),
    onSettled: () => {
      refresh();
      // An approved station must also appear on the map tab straight away.
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['station'] });
    },
  });
}

export function useSetStationHidden() {
  const queryClient = useQueryClient();
  const refresh = useRefreshAdminData();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => api.setStationHidden(id, hidden),
    onSettled: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['station'] });
    },
  });
}

export function useAdminTopups(status: RequestStatus) {
  return useQuery({
    queryKey: ['admin', 'topups', status],
    queryFn: () => api.listTopups(status),
  });
}

export function useReviewTopup() {
  const refresh = useRefreshAdminData();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewInput }) => api.reviewTopup(id, input),
    onSettled: refresh,
  });
}

export function useAdminWithdrawals(status: WithdrawalStatus) {
  return useQuery({
    queryKey: ['admin', 'withdrawals', status],
    queryFn: () => api.listWithdrawals(status),
  });
}

export function useProcessWithdrawal() {
  const refresh = useRefreshAdminData();
  return useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.processWithdrawal(id, approve),
    onSettled: refresh,
  });
}

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => api.listUsers(search || undefined),
    placeholderData: keepPreviousData,
  });
}

export function useSetUserBlocked() {
  const refresh = useRefreshAdminData();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      api.setUserBlocked(id, blocked),
    onSettled: refresh,
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.resetUserPassword(id, newPassword),
  });
}
