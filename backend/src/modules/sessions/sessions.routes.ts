import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import * as controller from './sessions.controller';
import { endSchema, idSchema, lookupSchema, startSchema } from './sessions.schema';

export const router = Router();

router.use(requireAuth, requireRole('customer'));
router.get('/charger/:qrToken', validate({ params: lookupSchema }), asyncHandler(controller.lookup));
router.post('/start', validate({ body: startSchema }), asyncHandler(controller.start));
router.get('/active', asyncHandler(controller.active));
router.get('/', asyncHandler(controller.list));
router.get('/:id', validate({ params: idSchema }), asyncHandler(controller.get));
router.post('/:id/end', validate({ params: idSchema, body: endSchema }), asyncHandler(controller.end));
router.post('/:id/cancel', validate({ params: idSchema }), asyncHandler(controller.cancel));

