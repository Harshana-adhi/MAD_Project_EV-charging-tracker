import type { User } from '@prisma/client';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import type { UpdateProfileInput } from './profile.schema';

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

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 404);
  return toPublicUser(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { fullName: input.fullName, phone: input.phone },
  });
  return toPublicUser(user);
}
