import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import { stationIdParamsSchema } from '../stations/stations.schema';
import { addReview, listReviews } from './reviews.service';

export const router = Router();
export const stationReviewsRouter = Router();

const reviewInput = z.object({
  sessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

stationReviewsRouter.get(
  '/:id/reviews',
  validate({ params: stationIdParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await listReviews(req.params.id) });
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('customer'),
  validate({ body: reviewInput }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof reviewInput>;
    res.status(201).json({ data: await addReview(req.user!.id, input) });
  }),
);

