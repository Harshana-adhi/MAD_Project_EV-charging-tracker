import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from './db';
import { AppError } from './errors';

export type AuthUser = {
  id: string;
  role: Role;
  fullName: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

async function loadUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('UNAUTHENTICATED', 401);
  if (user.isBlocked) throw new AppError('USER_BLOCKED', 403);
  return { id: user.id, role: user.role, fullName: user.fullName };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (process.env.NODE_ENV === 'development' && req.header('x-dev-user-id')) {
      req.user = await loadUser(req.header('x-dev-user-id') as string);
      return next();
    }

    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) throw new AppError('UNAUTHENTICATED', 401);

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw new AppError('TOKEN_EXPIRED', 401);
      throw new AppError('UNAUTHENTICATED', 401);
    }

    req.user = await loadUser(payload.sub as string);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('NOT_ALLOWED', 403));
    }
    next();
  };
}

export function assertOwner(ownerId: string, user: AuthUser): void {
  if (ownerId !== user.id) throw new AppError('NOT_ALLOWED', 403);
}
