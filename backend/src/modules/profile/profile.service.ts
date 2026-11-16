import { randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import { checkPassword, hashPassword } from '../../core/password';
import type { AuthUser } from '../../core/auth.middleware';
import type { UpdateProfileInput } from './profile.schema';

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isBlocked: user.isBlocked,
    isDeleted: !!user.deletedAt,
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

// Admins can only terminate (block) an account, never delete it – this is the one path
// that actually removes someone's identity, and only the account's own owner can take it.
export async function deleteOwnAccount(requester: AuthUser, password: string) {
  const user = await prisma.user.findUnique({ where: { id: requester.id } });
  if (!user) throw new AppError('NOT_FOUND', 404);
  if (!(await checkPassword(password, user.passwordHash))) {
    throw new AppError('INVALID_CREDENTIALS', 401);
  }

  const activeSession = await prisma.session.findFirst({
    where: { customerId: requester.id, status: 'active' },
    select: { id: true },
  });
  if (activeSession) throw new AppError('ACTIVE_SESSION_EXISTS', 409);

  if (requester.role === 'customer') {
    const upcomingBooking = await prisma.booking.findFirst({
      where: { customerId: requester.id, status: 'booked' },
      select: { id: true },
    });
    if (upcomingBooking) throw new AppError('BOOKING_EXISTS', 409);
  }

  if (requester.role === 'owner') {
    const activeSessionAtMyStation = await prisma.session.findFirst({
      where: { station: { ownerId: requester.id }, status: 'active' },
      select: { id: true },
    });
    if (activeSessionAtMyStation) throw new AppError('STATION_HAS_ACTIVE_SESSION', 409);
  }

  // Never actually delete the row – it's still referenced by sessions, reviews, wallet
  // transactions and (for an owner) stations, all of which stay intact on purpose. Instead
  // the identity is anonymised and the password invalidated, which is what "delete my
  // account" means here: nobody can sign in as this person again, and their name/email
  // disappear, but the ledger and other people's records don't quietly lose history.
  const randomPassword = await hashPassword(randomBytes(32).toString('hex'));
  await prisma.user.update({
    where: { id: requester.id },
    data: {
      email: `deleted-${requester.id}@deleted.greencharge.space`,
      fullName: 'Deleted user',
      phone: null,
      passwordHash: randomPassword,
      deletedAt: new Date(),
    },
  });
  return { ok: true };
}
