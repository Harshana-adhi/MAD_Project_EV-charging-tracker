import type { User } from '@prisma/client';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import type { AuthUser } from '../../core/auth.middleware';
import { hashPassword } from '../../core/password';
import { notify } from '../../core/notify.service';

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}

export async function getCounts() {
  const [pendingStations, pendingTopups, pendingWithdrawals, users] = await Promise.all([
    prisma.station.count({ where: { status: 'pending' } }),
    prisma.topupRequest.count({ where: { status: 'pending', method: 'slip' } }),
    prisma.withdrawal.count({ where: { status: 'pending' } }),
    prisma.user.count(),
  ]);
  return { pendingStations, pendingTopups, pendingWithdrawals, users };
}

export async function listUsers(search?: string) {
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return users.map(toPublicUser);
}

export async function setUserBlocked(admin: AuthUser, userId: string, blocked: boolean) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError('NOT_FOUND', 404);
  if (target.id === admin.id || target.role === 'admin') throw new AppError('NOT_ALLOWED', 403);

  const user = await prisma.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  return toPublicUser(user);
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError('NOT_FOUND', 404);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await notify({
    userId,
    title: 'Password reset',
    body: 'Your password was reset by an admin',
    type: 'password_reset',
  });
  return { ok: true };
}
