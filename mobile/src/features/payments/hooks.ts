import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { onEvent } from '@/lib/socket';
import type { TxnType } from '@/types/domain';
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
