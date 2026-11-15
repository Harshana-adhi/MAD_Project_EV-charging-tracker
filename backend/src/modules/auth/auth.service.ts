import jwt from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { prisma, withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import { hashPassword, checkPassword } from '../../core/password';
import { credit } from '../../core/credit.service';
import { sendEmailInBackground } from '../../core/email.service';
import { config } from '../../config';

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

function signToken(user: { id: string; role: Role }) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'owner';
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError('EMAIL_TAKEN', 409);

  const passwordHash = await hashPassword(input.password);

  const user = await withTx(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
      },
    });
    await credit.createWallet(tx, created.id);
    return created;
  });

  sendEmailInBackground({
    to: user.email,
    subject: 'Welcome to GreenCharge',
    heading: 'Welcome to GreenCharge',
    message:
      `Hi ${user.fullName.split(' ')[0]},\n` +
      (user.role === 'owner'
        ? 'Your station owner account is ready. Add your charging station in the app – it will appear on the map after an admin approves it.'
        : 'Your account is ready. Find a charger on the map, top up your wallet and start charging with credits.'),
  });

  return { token: signToken(user), user: toPublicUser(user) };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await checkPassword(input.password, user.passwordHash))) {
    throw new AppError('INVALID_CREDENTIALS', 401);
  }
  if (user.isBlocked) throw new AppError('USER_BLOCKED', 403);

  return { token: signToken(user), user: toPublicUser(user) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('UNAUTHENTICATED', 401);
  return toPublicUser(user);
}
