import { z } from 'zod';

export const startSessionSchema = z.object({
  qrToken: z.string().trim().min(1),
  spendingLimit: z.coerce.number().positive().max(1_000_000),
});

export const stopSessionSchema = z.object({
  kwh: z.coerce.number().positive().max(1000),
});

export const sessionIdParamsSchema = z.object({ id: z.string().uuid() });

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type StopSessionInput = z.infer<typeof stopSessionSchema>;
