import { Router } from 'express';
import { requireAuth } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { updateProfileSchema } from './profile.schema';
import * as controller from './profile.controller';

export const router = Router();

router.get('/', requireAuth, asyncHandler(controller.getProfile));
router.patch(
  '/',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(controller.updateProfile),
);
