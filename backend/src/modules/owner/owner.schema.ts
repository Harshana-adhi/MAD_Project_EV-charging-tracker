import { z } from 'zod';

const amenitiesSchema = z.array(
  z.enum(['Parking', 'WiFi', 'Restroom', 'Cafe', 'Restaurant', 'Shop', 'Wheelchair access']),
);

export const stationIdParamsSchema = z.object({ id: z.string().uuid() });

export const stationInputSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  address: z.string().trim().min(5).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  openingHours: z.string().trim().min(3).max(40),
  amenities: amenitiesSchema,
});

export const updateStationSchema = stationInputSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: 'At least one station field is required' },
);

const connectorSchema = z.enum(['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT']);

export const chargerIdParamsSchema = z.object({ id: z.string().uuid() });
export const chargerInStationParamsSchema = z.object({
  id: z.string().uuid(),
  chargerId: z.string().uuid(),
});
export const sessionIdParamsSchema = z.object({ id: z.string().uuid() });

export const chargerInputSchema = z
  .object({
    label: z.string().trim().min(1).max(30),
    connector: connectorSchema,
    powerKw: z.number().min(3).max(350),
    ratePerKwh: z.number().min(10).max(500),
  })
  .strict();

export const updateChargerSchema = chargerInputSchema
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one charger field is required',
  });

export const chargerStatusSchema = z
  .object({ status: z.enum(['available', 'offline']) })
  .strict();

export const disputeSchema = z.object({
  reason: z.string().trim().min(10).max(300),
});

export const earningsQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((query) => Boolean(query.from) === Boolean(query.to), {
    message: 'Both from and to dates are required',
  });

export const withdrawalSchema = z
  .object({
    amount: z.number().finite().min(500).refine((amount) => Number.isInteger(amount * 100), {
      message: 'Amount can have at most two decimal places',
    }),
    bankNote: z.string().trim().min(5).max(200),
  })
  .strict();

export type StationInput = z.infer<typeof stationInputSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type ChargerInput = z.infer<typeof chargerInputSchema>;
export type UpdateChargerInput = z.infer<typeof updateChargerSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type EarningsQuery = z.infer<typeof earningsQuerySchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
