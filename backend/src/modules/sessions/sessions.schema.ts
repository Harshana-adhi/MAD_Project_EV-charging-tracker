import { z } from 'zod';

const qrToken = z.string().regex(/^[A-Za-z0-9_-]{8,20}$/);

export const lookupSchema = z.object({ qrToken });
export const idSchema = z.object({ id: z.uuid() });
export const startSchema = z.object({
  qrToken,
  spendingLimit: z.number().min(100).max(20000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8),
});
export const endSchema = z.object({
  kwh: z.number().positive().max(500).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8),
});
