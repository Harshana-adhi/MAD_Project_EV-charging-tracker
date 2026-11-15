import { Router } from 'express';
import { TxnType } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import { listTransactions } from './transactions.service';

export const router = Router();

const transactionFilters = z.object({ type: z.enum(TxnType).optional() });

router.get(
  '/',
  requireAuth,
  validate({ query: transactionFilters }),
  asyncHandler(async (req, res) => {
    const { type } = req.query as z.infer<typeof transactionFilters>;
    const transactions = await listTransactions(req.user!.id, type);
    res.json({ data: transactions });
  }),
);

