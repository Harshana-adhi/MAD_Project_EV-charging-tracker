import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import {
  incomeQuerySchema,
  monthQuerySchema,
  ownerIdParamsSchema,
  periodKeyParamsSchema,
} from './reports.schema';
import * as controller from './reports.controller';

export const router = Router();

router.use(requireAuth);

// An owner can only ever see their own statement.
router.get(
  '/me',
  requireRole('owner'),
  validate({ query: monthQuerySchema }),
  asyncHandler(controller.getMyStatement),
);

router.get(
  '/income',
  requireRole('admin'),
  validate({ query: incomeQuerySchema }),
  asyncHandler(controller.listIncome),
);
router.get(
  '/income/:key',
  requireRole('admin'),
  validate({ params: periodKeyParamsSchema }),
  asyncHandler(controller.getIncomeDetail),
);
router.get(
  '/owners/:ownerId',
  requireRole('admin'),
  validate({ params: ownerIdParamsSchema, query: monthQuerySchema }),
  asyncHandler(controller.getOwnerStatement),
);
