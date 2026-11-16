import { z } from 'zod';

export const bookingIdParamsSchema = z.object({ id: z.string().uuid() });

export const stationBookingsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createBookingSchema = z.object({
  chargerId: z.string().uuid(),
  startAt: z.string().datetime(),
  durationMinutes: z.union([z.literal(30), z.literal(60)]),
});
