import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import { stationIdParamsSchema } from '../stations/stations.schema';
import * as controller from './bookings.controller';
import { bookingIdParamsSchema, createBookingSchema, stationBookingsQuerySchema } from './bookings.schema';

export const router = Router();
export const stationBookingsRouter = Router();
export const ownerBookingsRouter = Router();

// Public – anyone (including guests) can see a station's taken slots for a day.
stationBookingsRouter.get(
  '/:id/bookings',
  validate({ params: stationIdParamsSchema, query: stationBookingsQuerySchema }),
  asyncHandler(controller.listForStation),
);

router.use(requireAuth);

router.post('/', requireRole('customer'), validate({ body: createBookingSchema }), asyncHandler(controller.create));
router.get('/mine', requireRole('customer'), asyncHandler(controller.listMine));
router.post(
  '/:id/cancel',
  requireRole('customer'),
  validate({ params: bookingIdParamsSchema }),
  asyncHandler(controller.cancel),
);

ownerBookingsRouter.get('/bookings', requireAuth, requireRole('owner'), asyncHandler(controller.listForOwner));
ownerBookingsRouter.get('/bookings/history', requireAuth, requireRole('owner'), asyncHandler(controller.historyForOwner));
