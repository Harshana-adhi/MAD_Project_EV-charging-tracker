import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/auth.middleware';
import { validate } from '../../core/validate';
import { asyncHandler } from '../../core/errors';
import { updateVehicleSchema, vehicleIdParamsSchema, vehicleSchema } from './vehicles.schema';
import * as controller from './vehicles.controller';

export const router = Router();

router.use(requireAuth, requireRole('customer'));

router.get('/', asyncHandler(controller.listVehicles));
router.post('/', validate({ body: vehicleSchema }), asyncHandler(controller.createVehicle));
router.patch(
  '/:id',
  validate({ params: vehicleIdParamsSchema, body: updateVehicleSchema }),
  asyncHandler(controller.updateVehicle),
);
router.delete(
  '/:id',
  validate({ params: vehicleIdParamsSchema }),
  asyncHandler(controller.deleteVehicle),
);
