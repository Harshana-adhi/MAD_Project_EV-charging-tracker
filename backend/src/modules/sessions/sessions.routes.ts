import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { sessionIdParamsSchema, startSessionSchema, stopSessionSchema } from './sessions.schema';
import * as controller from './sessions.controller';

export const router = Router();

router.use(requireAuth);

router.get('/', requireRole('customer'), asyncHandler(controller.listMySessions));
router.post(
  '/start',
  requireRole('customer'),
  validate({ body: startSessionSchema }),
  asyncHandler(controller.startSession),
);
router.get(
  '/:id',
  validate({ params: sessionIdParamsSchema }),
  asyncHandler(controller.getSession),
);
router.post(
  '/:id/stop',
  requireRole('customer'),
  validate({ params: sessionIdParamsSchema, body: stopSessionSchema }),
  asyncHandler(controller.stopSession),
);
router.post(
  '/:id/cancel',
  requireRole('customer'),
  validate({ params: sessionIdParamsSchema }),
  asyncHandler(controller.cancelSession),
);
