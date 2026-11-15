import { z } from 'zod';

const connectorEnum = z.enum(['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT']);

export const chargerInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  connector: connectorEnum,
  powerKw: z.coerce.number().positive().max(500),
  ratePerKwh: z.coerce.number().positive().max(1000),
});

export const createStationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().min(2).max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  openingHours: z.string().trim().min(2).max(60),
  amenities: z.array(z.string().trim().max(40)).max(20).default([]),
  photos: z.array(z.string().trim().max(500)).max(10).default([]),
  chargers: z.array(chargerInputSchema).min(1).max(20),
});

export const updateStationSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().min(2).max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  openingHours: z.string().trim().min(2).max(60).optional(),
  amenities: z.array(z.string().trim().max(40)).max(20).optional(),
  photos: z.array(z.string().trim().max(500)).max(10).optional(),
});

export const addChargerSchema = chargerInputSchema;

export const updateChargerSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  connector: connectorEnum.optional(),
  powerKw: z.coerce.number().positive().max(500).optional(),
  ratePerKwh: z.coerce.number().positive().max(1000).optional(),
  status: z.enum(['available', 'offline']).optional(),
});

export const stationIdParamsSchema = z.object({ id: z.string().uuid() });
export const chargerParamsSchema = z.object({
  id: z.string().uuid(),
  chargerId: z.string().uuid(),
});

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type AddChargerInput = z.infer<typeof addChargerSchema>;
export type UpdateChargerInput = z.infer<typeof updateChargerSchema>;
