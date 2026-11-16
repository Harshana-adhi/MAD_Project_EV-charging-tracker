import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import { listFavourites, toggleFavourite } from './favourites.service';

export const router = Router();

router.use(requireAuth, requireRole('customer'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listFavourites(req.user!.id) });
  }),
);

router.post(
  '/:stationId',
  validate({ params: z.object({ stationId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json({ data: await toggleFavourite(req.user!.id, req.params.stationId) });
  }),
);

