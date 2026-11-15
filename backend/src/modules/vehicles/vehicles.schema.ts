import { z } from 'zod';

export const vehicleSchema = z.object({
  makeModel: z.string().trim().min(2).max(60),
  connector: z.enum(['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT']),
  batteryKwh: z.number().min(10).max(200).nullable().optional(),
});

export const updateVehicleSchema = vehicleSchema.partial();

export const vehicleIdParamsSchema = z.object({ id: z.string().uuid() });

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
