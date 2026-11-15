import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import * as controller from './sessions.controller';
import { endSchema, idSchema, lookupSchema, startSchema } from './sessions.schema';

export const router = Router();

router.use(requireAuth);

router.get('/charger/:qrToken', requireRole('customer'), validate({ params: lookupSchema }), asyncHandler(controller.lookup));
router.post('/start', requireRole('customer'), validate({ body: startSchema }), asyncHandler(controller.start));
router.get('/active', requireRole('customer'), asyncHandler(controller.active));
router.get('/', requireRole('customer'), asyncHandler(controller.list));
router.get('/:id', validate({ params: idSchema }), asyncHandler(controller.get));
router.post('/:id/end', requireRole('customer'), validate({ params: idSchema, body: endSchema }), asyncHandler(controller.end));
router.post('/:id/cancel', requireRole('customer'), validate({ params: idSchema }), asyncHandler(controller.cancel));