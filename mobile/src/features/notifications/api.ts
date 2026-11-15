import { api } from '@/lib/api';
import type { AppNotification } from '@/types/domain';

type Ok = { ok: true };

export function listNotifications(): Promise<AppNotification[]> {
  return api.get('/notifications') as unknown as Promise<AppNotification[]>;
}

export function markNotificationRead(id: string): Promise<Ok> {
  return api.patch(`/notifications/${encodeURIComponent(id)}/read`) as unknown as Promise<Ok>;
}

export function markAllNotificationsRead(): Promise<Ok> {
  return api.patch('/notifications/read-all') as unknown as Promise<Ok>;
}
