import { getCurrentMockUser } from '@/mocks/currentUser';
import { mockCharger, mockStationDetail } from '@/mocks/fixtures';
import type {
  Booking,
  BookingInput,
  BookingWithNames,
  OwnerBookingHistoryItem,
  OwnerBookingWithNames,
  TakenSlot,
} from '@/types/domain';

let bookings: Booking[] = [];

function toColomboDateString(iso: string): string {
  const colombo = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return colombo.toISOString().slice(0, 10);
}

export async function listStationBookings(stationId: string, date: string): Promise<TakenSlot[]> {
  return bookings
    .filter(
      (booking) =>
        booking.stationId === stationId &&
        (booking.status === 'booked' || booking.status === 'used') &&
        toColomboDateString(booking.startAt) === date,
    )
    .map((booking) => ({ chargerId: booking.chargerId, startAt: booking.startAt, endAt: booking.endAt }));
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const customer = getCurrentMockUser();
  if (bookings.some((booking) => booking.customerId === customer.id && booking.status === 'booked')) {
    throw new Error('BOOKING_EXISTS');
  }
  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + input.durationMinutes * 60 * 1000);
  const overlaps = bookings.some(
    (booking) =>
      booking.chargerId === input.chargerId &&
      booking.status === 'booked' &&
      new Date(booking.startAt) < endAt &&
      new Date(booking.endAt) > startAt,
  );
  if (overlaps) throw new Error('SLOT_TAKEN');

  const booking: Booking = {
    id: `mock-booking-${Date.now()}`,
    customerId: customer.id,
    chargerId: input.chargerId,
    stationId: mockStationDetail.id,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status: 'booked',
    sessionId: null,
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  };
  bookings = [booking, ...bookings];
  return booking;
}

export async function listMyBookings(): Promise<BookingWithNames[]> {
  const customer = getCurrentMockUser();
  return bookings
    .filter((booking) => booking.customerId === customer.id)
    .map((booking) => ({
      ...booking,
      stationName: mockStationDetail.name,
      chargerLabel: mockCharger.label,
      connector: mockCharger.connector,
    }));
}

export async function cancelBooking(id: string): Promise<Booking> {
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  if (booking.status !== 'booked' || new Date(booking.startAt).getTime() <= Date.now()) {
    throw new Error('BOOKING_NOT_CANCELLABLE');
  }
  const updated: Booking = { ...booking, status: 'cancelled', cancelledAt: new Date().toISOString() };
  bookings = bookings.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function listOwnerBookings(): Promise<OwnerBookingWithNames[]> {
  return bookings
    .filter((booking) => booking.status === 'booked')
    .map((booking) => ({
      ...booking,
      stationName: mockStationDetail.name,
      chargerLabel: mockCharger.label,
      customerName: 'Nimal Perera',
    }));
}

export async function listOwnerBookingHistory(): Promise<OwnerBookingHistoryItem[]> {
  return bookings
    .filter((booking) => booking.status !== 'booked' || new Date(booking.startAt).getTime() <= Date.now())
    .map((booking) => ({
      ...booking,
      stationName: mockStationDetail.name,
      chargerLabel: mockCharger.label,
      connector: mockCharger.connector,
      customerName: 'Nimal Perera',
      kwh: null,
      earned: null,
    }));
}
