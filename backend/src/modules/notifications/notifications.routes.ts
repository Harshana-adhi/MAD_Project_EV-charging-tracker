import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notifications.service';

export const router = Router();

const notificationId = z.object({ id: z.string().uuid() });

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listNotifications(req.user!.id) });
  }),
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await markAllNotificationsRead(req.user!.id);
    res.json({ data: { ok: true } });
  }),
);

router.patch(
  '/:id/read',
  validate({ params: notificationId }),
  asyncHandler(async (req, res) => {
    await markNotificationRead(req.user!.id, req.params.id);
    res.json({ data: { ok: true } });
  }),
);

