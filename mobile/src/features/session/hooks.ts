import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { addMockNotification } from '@/features/notifications/api.mock';
import { USE_MOCKS } from '@/lib/config';
import { onEvent } from '@/lib/socket';
import { api } from './index';

export function useChargerByQr(qrToken: string) {
  const queryClient = useQueryClient();
  useEffect(() => onEvent('wallet:updated', () => {
    queryClient.invalidateQueries({ queryKey: ['session-charger', qrToken] });
  }), [queryClient, qrToken]);
  return useQuery({
    queryKey: ['session-charger', qrToken],
    queryFn: () => api.getChargerByQr(qrToken),
    enabled: !!qrToken,
  });
}

export function useSession(id: string) {
  return useQuery({ queryKey: ['session', id], queryFn: () => api.getSession(id), enabled: !!id });
}

export function useActiveSession() {
  return useQuery({ queryKey: ['session-active'], queryFn: api.getActiveSession });
}

export function useMySessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: api.listMySessions });
}

export function useSessionEvents(id?: string) {
  const queryClient = useQueryClient();
  useEffect(() => onEvent('session:updated', (payload) => {
    if (id && (payload as { id?: string }).id !== id) return;
    queryClient.invalidateQueries({ queryKey: ['session'] });
    queryClient.invalidateQueries({ queryKey: ['session-active'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }), [id, queryClient]);
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, kwh }: { id: string; kwh: number }) => api.endSession(id, kwh),
    onSuccess: (_session, input) => {
      queryClient.invalidateQueries({ queryKey: ['session', input.id] });
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (USE_MOCKS && user) {
        addMockNotification(user, {
          title: 'Session completed',
          body: 'Your charging receipt is ready.',
          type: 'session_completed',
          refId: input.id,
        });
      }
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.cancelSession,
    onSuccess: (_session, id) => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      queryClient.invalidateQueries({ queryKey: ['session-active'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
