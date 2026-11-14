import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { topUpSchema } from './wallet.schema';
import * as controller from './wallet.controller';

export const router = Router();

router.get('/', requireAuth, asyncHandler(controller.getMyWallet));
router.post(
  '/topup',
  requireAuth,
  requireRole('customer'),
  validate({ body: topUpSchema }),
  asyncHandler(controller.topUpWithCard),
);
