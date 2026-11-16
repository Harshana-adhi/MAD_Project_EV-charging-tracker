import { z } from 'zod';

export const MIN_BOOKING_MINUTES = 30;
export const MAX_BOOKING_MINUTES = 240;

export const bookingIdParamsSchema = z.object({ id: z.string().uuid() });

export const stationBookingsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createBookingSchema = z.object({
  chargerId: z.string().uuid(),
  startAt: z.string().datetime(),
  // The slot length the app works out from the customer's charge target, in half-hour steps.
  durationMinutes: z
    .number()
    .int()
    .min(MIN_BOOKING_MINUTES)
    .max(MAX_BOOKING_MINUTES)
    .refine((minutes) => minutes % 30 === 0, { message: 'Bookings are in 30 minute steps' }),
});
