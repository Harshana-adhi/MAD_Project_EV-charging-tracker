import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { asyncHandler } from '../../core/errors';
import { validate } from '../../core/validate';
import * as controller from './owner.controller';
import {
  chargerIdParamsSchema,
  chargerInStationParamsSchema,
  chargerInputSchema,
  chargerStatusSchema,
  disputeSchema,
  earningsQuerySchema,
  sessionIdParamsSchema,
  stationIdParamsSchema,
  stationInputSchema,
  updateChargerSchema,
  updateStationSchema,
  withdrawalSchema,
} from './owner.schema';

export const router = Router();

router.use(requireAuth, requireRole('owner'));

router.get('/stations', asyncHandler(controller.listMyStations));
router.post('/stations', validate({ body: stationInputSchema }), asyncHandler(controller.createStation));
// Keep the existing team-facing detail and nested charger routes as compatible aliases.
router.get(
  '/stations/:id',
  validate({ params: stationIdParamsSchema }),
  asyncHandler(controller.getMyStationDetail),
);
router.patch(
  '/stations/:id',
  validate({ params: stationIdParamsSchema, body: updateStationSchema }),
  asyncHandler(controller.updateStation),
);
router.delete(
  '/stations/:id',
  validate({ params: stationIdParamsSchema }),
  asyncHandler(controller.deleteStation),
);
router.post(
  '/stations/:id/photos',
  validate({ params: stationIdParamsSchema }),
  asyncHandler(controller.ensurePhotoSlot),
  controller.parseStationPhoto,
  asyncHandler(controller.uploadStationPhoto),
);
router.post(
  '/stations/:id/chargers',
  validate({ params: stationIdParamsSchema, body: chargerInputSchema }),
  asyncHandler(controller.createCharger),
);
router.patch(
  '/stations/:id/chargers/:chargerId',
  validate({ params: chargerInStationParamsSchema, body: updateChargerSchema }),
  asyncHandler(controller.updateStationCharger),
);
router.patch(
  '/chargers/:id/status',
  validate({ params: chargerIdParamsSchema, body: chargerStatusSchema }),
  asyncHandler(controller.setChargerStatus),
);
router.patch(
  '/chargers/:id',
  validate({ params: chargerIdParamsSchema, body: updateChargerSchema }),
  asyncHandler(controller.updateCharger),
);
router.delete(
  '/chargers/:id',
  validate({ params: chargerIdParamsSchema }),
  asyncHandler(controller.deleteCharger),
);

router.get('/sessions', asyncHandler(controller.listOwnerSessions));
router.post(
  '/sessions/:id/dispute',
  validate({ params: sessionIdParamsSchema, body: disputeSchema }),
  asyncHandler(controller.disputeSession),
);
router.get(
  '/earnings',
  validate({ query: earningsQuerySchema }),
  asyncHandler(controller.getEarnings),
);
router.get(
  '/earnings/stations',
  validate({ query: earningsQuerySchema }),
  asyncHandler(controller.getStationEarnings),
);
router.get('/withdrawals', asyncHandler(controller.listMyWithdrawals));
router.post(
  '/withdrawals',
  validate({ body: withdrawalSchema }),
  asyncHandler(controller.requestWithdrawal),
);
