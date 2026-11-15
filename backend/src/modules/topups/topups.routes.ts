import { Router } from 'express';
import { MulterError } from 'multer';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { AppError, asyncHandler } from '../../core/errors';
import { uploadImage } from '../../core/upload';
import { validate } from '../../core/validate';
import { listMyTopups, requestSlipTopUp } from './topups.service';

export const router = Router();

const slipTopup = z.object({
  amount: z.string().trim().min(1).pipe(z.coerce.number<string>().int().min(100).max(50000)),
});

router.use(requireAuth, requireRole('customer'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listMyTopups(req.user!.id) });
  }),
);

router.post(
  '/slip',
  (req, res, next) => {
    uploadImage(req, res, (error: unknown) => {
      next(error instanceof MulterError ? new AppError('VALIDATION_ERROR', 400, error.message) : error);
    });
  },
  validate({ body: slipTopup }),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('VALIDATION_ERROR', 400, 'A slip image is required');
    const { amount } = req.body as z.infer<typeof slipTopup>;
    const request = await requestSlipTopUp(req.user!, amount, req.file);
    res.status(201).json({ data: request });
  }),
);

