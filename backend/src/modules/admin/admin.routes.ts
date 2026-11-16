import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import {
  blockUserSchema,
  hideStationSchema,
  idParamsSchema,
  processWithdrawalSchema,
  resetPasswordSchema,
  reviewSchema,
  stationStatusQuerySchema,
  topupStatusQuerySchema,
  usersQuerySchema,
  withdrawalStatusQuerySchema,
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

router.patch(
  '/stations/:id/hidden',
  validate({ params: idParamsSchema, body: hideStationSchema }),
  asyncHandler(controller.setStationHidden),
);

router.get(
  '/topups',
  validate({ query: topupStatusQuerySchema }),
  asyncHandler(controller.listTopups),
);
router.post(
  '/topups/:id/review',
  validate({ params: idParamsSchema, body: reviewSchema }),
  asyncHandler(controller.reviewTopup),
);

router.get(
  '/withdrawals',
  validate({ query: withdrawalStatusQuerySchema }),
  asyncHandler(controller.listWithdrawals),
);
router.post(
  '/withdrawals/:id/process',
  validate({ params: idParamsSchema, body: processWithdrawalSchema }),
  asyncHandler(controller.processWithdrawal),
);

router.get('/disputes', asyncHandler(controller.listDisputes));
router.post(
  '/disputes/:id/resolve',
  validate({ params: idParamsSchema }),
  asyncHandler(controller.resolveDispute),
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
