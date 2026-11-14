import { Router } from 'express';
import { optionalAuth } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { stationFiltersSchema, stationIdParamsSchema } from './stations.schema';
import * as controller from './stations.controller';

export const router = Router();

router.get('/', validate({ query: stationFiltersSchema }), asyncHandler(controller.listStations));
router.get(
  '/:id',
  validate({ params: stationIdParamsSchema }),
  optionalAuth,
  asyncHandler(controller.getStation),
);
