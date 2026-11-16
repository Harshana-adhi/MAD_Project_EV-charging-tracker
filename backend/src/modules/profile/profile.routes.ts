import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { deleteAccountSchema, updateProfileSchema } from './profile.schema';
import * as controller from './profile.controller';

export const router = Router();

router.get('/', requireAuth, asyncHandler(controller.getProfile));
router.patch(
  '/',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(controller.updateProfile),
);
// Only the account's own customer/owner can delete it – admins can only terminate (block) one.
router.delete(
  '/',
  requireAuth,
  requireRole('customer', 'owner'),
  validate({ body: deleteAccountSchema }),
  asyncHandler(controller.deleteAccount),
);
