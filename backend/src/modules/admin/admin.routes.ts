import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import {
  blockUserSchema,
  idParamsSchema,
  resetPasswordSchema,
  reviewSchema,
  stationStatusQuerySchema,
  usersQuerySchema,
} from './admin.schema';
import * as controller from './admin.controller';

export const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/counts', asyncHandler(controller.getCounts));

router.get(
  '/stations',
  validate({ query: stationStatusQuerySchema }),
  asyncHandler(controller.listStationsByStatus),
);
router.post(
  '/stations/:id/review',
  validate({ params: idParamsSchema, body: reviewSchema }),
  asyncHandler(controller.reviewStation),
);

router.get('/users', validate({ query: usersQuerySchema }), asyncHandler(controller.listUsers));
router.patch(
  '/users/:id/block',
  validate({ params: idParamsSchema, body: blockUserSchema }),
  asyncHandler(controller.setUserBlocked),
);
router.patch(
  '/users/:id/password',
  validate({ params: idParamsSchema, body: resetPasswordSchema }),
  asyncHandler(controller.resetUserPassword),
);
