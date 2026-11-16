import { api as http } from '@/lib/api';
import type { Booking, BookingInput, BookingWithNames, OwnerBookingWithNames, TakenSlot } from '@/types/domain';

export function listStationBookings(stationId: string, date: string): Promise<TakenSlot[]> {
  return http.get(`/stations/${encodeURIComponent(stationId)}/bookings`, {
    params: { date },
  }) as unknown as Promise<TakenSlot[]>;
}

export function createBooking(input: BookingInput): Promise<Booking> {
  return http.post('/bookings', input) as unknown as Promise<Booking>;
}

export function listMyBookings(): Promise<BookingWithNames[]> {
  return http.get('/bookings/mine') as unknown as Promise<BookingWithNames[]>;
}

export function cancelBooking(id: string): Promise<Booking> {
  return http.post(`/bookings/${encodeURIComponent(id)}/cancel`) as unknown as Promise<Booking>;
}

export function listOwnerBookings(): Promise<OwnerBookingWithNames[]> {
  return http.get('/owner/bookings') as unknown as Promise<OwnerBookingWithNames[]>;
}
