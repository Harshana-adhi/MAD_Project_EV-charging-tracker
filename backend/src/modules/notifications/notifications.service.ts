import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';

export function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      refId: true,
      read: true,
      createdAt: true,
    },
  });
}

export async function markNotificationRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, id },
    data: { read: true },
  });
  if (result.count === 0) throw new AppError('NOT_FOUND', 404);
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
