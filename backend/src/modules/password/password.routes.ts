import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from './password.schema';
import * as controller from './password.controller';

export const router = Router();

// Limits code requests and guesses per device, so a 6-digit code cannot be brute-forced.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again later.' },
    });
  },
});

router.patch(
  '/',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(controller.changePassword),
);
router.post(
  '/forgot',
  resetLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(controller.requestPasswordReset),
);
router.post(
  '/reset',
  resetLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(controller.resetPassword),
);
