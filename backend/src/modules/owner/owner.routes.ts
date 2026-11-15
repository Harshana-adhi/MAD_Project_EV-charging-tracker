import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import {
  addChargerSchema,
  chargerParamsSchema,
  createStationSchema,
  stationIdParamsSchema,
  updateChargerSchema,
  updateStationSchema,
} from './owner.schema';
import * as controller from './owner.controller';

export const router = Router();

router.use(requireAuth, requireRole('owner'));

router.get('/stations', asyncHandler(controller.listOwnStations));
router.post(
  '/stations',
  validate({ body: createStationSchema }),
  asyncHandler(controller.createStation),
);
router.get(
  '/stations/:id',
  validate({ params: stationIdParamsSchema }),
  asyncHandler(controller.getOwnStation),
);
router.patch(
  '/stations/:id',
  validate({ params: stationIdParamsSchema, body: updateStationSchema }),
  asyncHandler(controller.updateStation),
);

router.post(
  '/stations/:id/chargers',
  validate({ params: stationIdParamsSchema, body: addChargerSchema }),
  asyncHandler(controller.addCharger),
);
router.patch(
  '/stations/:id/chargers/:chargerId',
  validate({ params: chargerParamsSchema, body: updateChargerSchema }),
  asyncHandler(controller.updateCharger),
);

router.get('/sessions', asyncHandler(controller.listOwnSessions));
