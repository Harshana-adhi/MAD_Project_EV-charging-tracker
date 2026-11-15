import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { USE_MOCKS } from '@/lib/config';
import { onEvent } from '@/lib/socket';
import type { AppNotification } from '@/types/domain';
import * as real from './api';
import * as mock from './api.mock';

const api = USE_MOCKS ? mock : real;

function inboxKey(userId?: string) {
  return ['notifications', userId];
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: inboxKey(user?.id),
    queryFn: api.listNotifications,
    enabled: !!user,
  });
}

export function useNotificationEvents() {
  const { user, token } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !token) return;
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: inboxKey(userId) }); };
    if (USE_MOCKS) {
      return mock.onMockNotification((recipientId) => {
        if (recipientId === userId) refresh();
      });
    }

    const stopNotifications = onEvent('notification:new', refresh);
    const stopReconnect = onEvent('connect', refresh);
    return () => {
      stopNotifications();
      stopReconnect();
    };
  }, [queryClient, token, userId]);
}

export function useNotificationActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = inboxKey(user?.id);

  const markRead = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<AppNotification[]>(queryKey, (items) =>
        items?.map((item) => item.id === id ? { ...item, read: true } : item),
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const markAllRead = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  return { markRead, markAllRead };
}
