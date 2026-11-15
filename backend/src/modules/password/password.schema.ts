import { z } from 'zod';

const newPassword = z.string().min(8).max(64);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'The new password must be different',
    path: ['newPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(10),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
