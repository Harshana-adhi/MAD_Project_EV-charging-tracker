import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onEvent } from '@/lib/socket';
import { api } from './index';

export const WALLET_QUERY_KEY = ['wallet'];

export function useMyWallet() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onEvent('wallet:updated', () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
    });
  }, [queryClient]);

  return useQuery({ queryKey: WALLET_QUERY_KEY, queryFn: api.getMyWallet });
}
