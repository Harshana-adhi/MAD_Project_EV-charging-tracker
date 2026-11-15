import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { WALLET_QUERY_KEY } from '@/features/wallet/hooks';
import { onEvent } from '@/lib/socket';
import type { TopupRequest, TxnType } from '@/types/domain';
import { api } from './index';

export function useTransactions(type?: TxnType) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    return onEvent('wallet:updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    });
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ['transactions', userId, type ?? 'all'],
    queryFn: () => api.listTransactions(type),
    enabled: !!userId,
  });
}

export function useMyTopups(userId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onEvent('notification:new', (payload) => {
      if (payload && typeof payload === 'object' && 'type' in payload && payload.type === 'topup_review') {
        void queryClient.invalidateQueries({ queryKey: ['topups', userId] });
      }
    });
  }, [queryClient, userId]);

  return useQuery({ queryKey: ['topups', userId], queryFn: api.listMyTopups });
}

export function useRequestSlipTopUp(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['topups', userId];

  return useMutation({
    mutationFn: ({ amount, imageUri }: { amount: number; imageUri: string }) =>
      api.requestSlipTopUp(amount, imageUri),
    onSuccess: (request) => {
      queryClient.setQueryData<TopupRequest[]>(queryKey, (previous) => [
        request,
        ...(previous ?? []).filter(({ id }) => id !== request.id),
      ]);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      void queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
    },
  });
}
