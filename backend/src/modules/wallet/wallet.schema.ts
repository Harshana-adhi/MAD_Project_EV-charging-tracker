import { z } from 'zod';

export const topUpSchema = z.object({
  amount: z.number().int().min(100).max(50000),
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{16}$/)),
});
