import { z } from 'zod';

const booleanParam = z
  .string()
  .optional()
  .transform((value) => value === 'true');

export const stationFiltersSchema = z
  .object({
    connector: z.enum(['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT']).optional(),
    minPowerKw: z.coerce.number().positive().optional(),
    maxRate: z.coerce.number().positive().optional(),
    availableOnly: booleanParam,
    search: z.string().max(50).optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
  })
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: 'lat and lng must be provided together',
  });

export const stationIdParamsSchema = z.object({ id: z.string().uuid() });
