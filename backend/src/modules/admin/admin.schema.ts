import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const stationStatusQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'hidden']).default('pending'),
});

export const hideStationSchema = z.object({ hidden: z.boolean() });

export const topupStatusQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

export const reviewSchema = z
  .object({
    approve: z.boolean(),
    reason: z.string().trim().min(5).max(200).optional(),
  })
  .refine((value) => value.approve || !!value.reason, {
    message: 'A reason is required when rejecting',
    path: ['reason'],
  });

export type ReviewInput = z.infer<typeof reviewSchema>;

export const withdrawalStatusQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'rejected']).default('pending'),
});

export const processWithdrawalSchema = z.object({ approve: z.boolean() });

export const usersQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
});

export const blockUserSchema = z.object({ blocked: z.boolean() });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(64),
});
