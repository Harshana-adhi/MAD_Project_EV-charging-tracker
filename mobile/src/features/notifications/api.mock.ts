import { getCurrentMockUser } from '@/mocks/currentUser';
import { mockNotification } from '@/mocks/fixtures';
import type { AppNotification, Role, User } from '@/types/domain';

const inboxes = new Map<string, AppNotification[]>();
const listeners = new Set<(userId: string) => void>();
type Message = Pick<AppNotification, 'title' | 'body' | 'type' | 'refId'>;

const demoMessages: Record<Role, Message> = {
  customer: {
    title: 'Top-up approved',
    body: 'Your demo top-up of LKR 500.00 was approved.',
    type: 'topup_review',
    refId: null,
  },
  owner: {
    title: 'Station approved',
    body: 'Your demo charging station is visible on the map.',
    type: 'station_review',
    refId: null,
  },
  admin: {
    title: 'New slip top-up',
    body: 'A demo bank-slip request is ready for review.',
    type: 'topup_pending',
    refId: null,
  },
};

function getInbox(user: User) {
  const inbox = inboxes.get(user.id) ?? [{
    ...mockNotification,
    ...demoMessages[user.role],
    id: `mock-notification-${user.id}`,
  }];
  inboxes.set(user.id, inbox);
  return inbox;
}

export async function listNotifications(): Promise<AppNotification[]> {
  return getInbox(getCurrentMockUser()).slice(0, 50).map((note) => ({ ...note }));
}

export async function markNotificationRead(id: string): Promise<{ ok: true }> {
  const note = getInbox(getCurrentMockUser()).find((item) => item.id === id);
  if (!note) throw new Error('NOT_FOUND');
  note.read = true;
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  for (const note of getInbox(getCurrentMockUser())) note.read = true;
  return { ok: true };
}

export function onMockNotification(listener: (userId: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function addMockNotification(user: User, message: Message) {
  const inbox = getInbox(user);
  inbox.unshift({
    ...message,
    id: `mock-notification-${user.id}-${inbox.length}`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  for (const listener of listeners) listener(user.id);
}
