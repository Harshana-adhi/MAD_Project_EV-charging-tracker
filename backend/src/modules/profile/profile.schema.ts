import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(60).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(0\d{9})?$/, 'Phone must be 10 digits starting with 0')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
