import { prisma } from './db';
import { emitToUser } from './socket';

type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  type: string;
  refId?: string;
};

export async function notify(input: NotifyInput): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      refId: input.refId,
    },
  });
  emitToUser(input.userId, 'notification:new', notification);
}

export async function notifyAdmins(
  input: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  await Promise.all(admins.map((admin) => notify({ ...input, userId: admin.id })));
}
