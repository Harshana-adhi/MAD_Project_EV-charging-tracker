import { z } from 'zod';

export const incomeQuerySchema = z.object({
  period: z.enum(['day', 'month', 'year']).default('month'),
});

export const periodKeyParamsSchema = z.object({
  key: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'Use YYYY, YYYY-MM or YYYY-MM-DD'),
});

export const ownerIdParamsSchema = z.object({ ownerId: z.string().uuid() });

export const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM')
    .optional(),
});

export type IncomePeriod = z.infer<typeof incomeQuerySchema>['period'];
