import { prisma } from './db';
import { emitToUser } from './socket';
import { sendEmailInBackground } from './email.service';

type NotifyInput = {
  userId: string;
  title: string;
  body: string;
  type: string;
  refId?: string;
  email?: boolean;
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

  if (input.email) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, fullName: true },
    });
    if (user) {
      sendEmailInBackground({
        to: user.email,
        subject: input.title,
        heading: input.title,
        message: `Hi ${user.fullName.split(' ')[0]},\n${input.body}`,
      });
    }
  }
}

export async function notifyAdmins(
  input: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  await Promise.all(admins.map((admin) => notify({ ...input, userId: admin.id })));
}
