import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const usersQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
});

export const blockUserSchema = z.object({ blocked: z.boolean() });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(64),
});
