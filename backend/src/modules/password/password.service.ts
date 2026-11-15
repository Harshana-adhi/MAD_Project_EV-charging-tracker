import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import { checkPassword, hashPassword } from '../../core/password';
import { sendEmailInBackground } from '../../core/email.service';
import { config } from '../../config';
import type { ChangePasswordInput, ResetPasswordInput } from './password.schema';

const CODE_MINUTES = 10;
const PURPOSE = 'password-reset';

type ResetClaims = jwt.JwtPayload & { purpose: string; otp: string; pwv: string };

// The code is never stored. The app keeps a signed token holding a keyed hash of the code, so the
// code can only be checked by this server. The token also holds a fingerprint of the current
// password hash, so it stops working as soon as the password changes (one use only).
function codeDigest(userId: string, otp: string): string {
  return createHmac('sha256', config.jwtSecret).update(`${userId}:${otp}`).digest('hex');
}

function passwordVersion(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

function signResetToken(userId: string, otp: string, passwordHash: string): string {
  return jwt.sign(
    { purpose: PURPOSE, otp: codeDigest(userId, otp), pwv: passwordVersion(passwordHash) },
    config.jwtSecret,
    { subject: userId, expiresIn: `${CODE_MINUTES}m` },
  );
}

function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function firstName(user: User): string {
  return user.fullName.split(' ')[0];
}

function sendPasswordChangedEmail(user: User) {
  sendEmailInBackground({
    to: user.email,
    subject: 'Your GreenCharge password was changed',
    heading: 'Password changed',
    message: `Hi ${firstName(user)},\nYour GreenCharge password was just changed.\nIf this wasn't you, contact the GreenCharge team straight away.`,
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 404);
  // 400 rather than 401, so a wrong current password does not log the user out of the app.
  if (!(await checkPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError('WRONG_PASSWORD', 400, 'The current password is incorrect');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  sendPasswordChangedEmail(user);
  return { ok: true };
}

export async function requestPasswordReset(email: string) {
  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const user = await prisma.user.findUnique({ where: { email } });

  // Unknown and blocked accounts get a token that can never work, so the response does not
  // reveal which emails are registered.
  if (!user || user.isBlocked) {
    return { resetToken: signResetToken(randomUUID(), otp, randomUUID()) };
  }

  sendEmailInBackground({
    to: user.email,
    subject: 'Your GreenCharge password reset code',
    heading: 'Reset your password',
    message: `Hi ${firstName(user)},\nYour password reset code is ${otp}.\nIt expires in ${CODE_MINUTES} minutes.\nIf you didn't ask to reset your password, you can ignore this email.`,
  });
  return { resetToken: signResetToken(user.id, otp, user.passwordHash) };
}

export async function resetPassword(input: ResetPasswordInput) {
  let claims: ResetClaims;
  try {
    claims = jwt.verify(input.resetToken, config.jwtSecret) as ResetClaims;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('CODE_EXPIRED', 400, 'The code has expired');
    }
    throw new AppError('INVALID_CODE', 400, 'The code is not valid');
  }
  if (claims.purpose !== PURPOSE || !claims.sub) {
    throw new AppError('INVALID_CODE', 400, 'The code is not valid');
  }

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  const valid =
    !!user &&
    !user.isBlocked &&
    sameDigest(claims.pwv, passwordVersion(user.passwordHash)) &&
    sameDigest(claims.otp, codeDigest(user.id, input.otp));
  if (!user || !valid) throw new AppError('INVALID_CODE', 400, 'The code is not valid');

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  sendPasswordChangedEmail(user);
  return { ok: true };
}
