import type { Booking } from '@prisma/client';
import { prisma, type Tx, withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import { notify } from '../../core/notify.service';
import { runBookingSweep } from '../../core/booking.jobs';
import { broadcastBookingChanged, colomboDayStartUtc, colomboMinutesOfDay, isWithinOpeningHours } from './slots';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const GUARD_BEFORE_START_MS = 5 * 60 * 1000;

function plainBooking(booking: Booking) {
  return {
    id: booking.id,
    customerId: booking.customerId,
    chargerId: booking.chargerId,
    stationId: booking.stationId,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
    sessionId: booking.sessionId,
    createdAt: booking.createdAt.toISOString(),
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
  };
}

// The booking that currently blocks anyone else from starting a session on this charger –
// from 5 minutes before its start until the slot ends, as long as it is still "booked".
// Once the no-show job (or this same check, run opportunistically) flips a stale one to
// "expired" it naturally stops matching, so this already respects the start+15min cutoff.
export async function findGuardingBooking(tx: Tx, chargerId: string, now: Date) {
  return tx.booking.findFirst({
    where: {
      chargerId,
      status: 'booked',
      startAt: { lte: new Date(now.getTime() + GUARD_BEFORE_START_MS) },
      endAt: { gt: now },
    },
    orderBy: { startAt: 'asc' },
  });
}

// For the "Reserved until HH:mm" badge on station details: which of this station's
// chargers are currently inside a booking's guard window, and until when.
export async function getReservedUntilByCharger(stationId: string): Promise<Record<string, string>> {
  const now = new Date();
  const guarding = await prisma.booking.findMany({
    where: {
      stationId,
      status: 'booked',
      startAt: { lte: new Date(now.getTime() + GUARD_BEFORE_START_MS) },
      endAt: { gt: now },
    },
    select: { chargerId: true, endAt: true },
  });
  const result: Record<string, string> = {};
  for (const booking of guarding) result[booking.chargerId] = booking.endAt.toISOString();
  return result;
}

export async function listStationBookings(stationId: string, date: string) {
  await runBookingSweep();
  const station = await prisma.station.findFirst({ where: { id: stationId, status: 'approved' } });
  if (!station) throw new AppError('NOT_FOUND', 404);

  const dayStart = colomboDayStartUtc(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      stationId,
      status: { in: ['booked', 'used'] },
      // Any booking that touches this day, including one that started the night before.
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    orderBy: { startAt: 'asc' },
  });

  // Times only – never the customer – per the public visibility rule.
  return bookings.map((booking) => ({
    chargerId: booking.chargerId,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
  }));
}

function assertValidSlot(startAt: Date, durationMinutes: number, openingHours: string) {
  const now = new Date();
  if (startAt.getTime() < now.getTime()) throw new AppError('VALIDATION_ERROR', 400, 'That slot is in the past');
  if (startAt.getTime() > now.getTime() + SEVEN_DAYS_MS) {
    throw new AppError('VALIDATION_ERROR', 400, 'Bookings can only be made up to 7 days ahead');
  }
  const startMin = colomboMinutesOfDay(startAt);
  if (startMin % 30 !== 0) throw new AppError('VALIDATION_ERROR', 400, 'Slots start on the hour or half hour');
  const endMin = startMin + durationMinutes;
  if (!isWithinOpeningHours(openingHours, startMin, endMin)) {
    throw new AppError('VALIDATION_ERROR', 400, 'That slot is outside the station\'s opening hours');
  }
}

export async function createBooking(
  customerId: string,
  input: { chargerId: string; startAt: string; durationMinutes: number },
) {
  await runBookingSweep();
  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + input.durationMinutes * 60 * 1000);

  const { booking, ownerId } = await withTx(async (tx) => {
    // Locks the charger so two simultaneous bookings for it are never evaluated at once –
    // the second transaction waits here, then sees the first one's row and fails cleanly.
    await tx.$queryRaw`SELECT id FROM chargers WHERE id = ${input.chargerId} FOR UPDATE`;
    const charger = await tx.charger.findUnique({ where: { id: input.chargerId }, include: { station: true } });
    if (!charger) throw new AppError('CHARGER_NOT_FOUND', 404);
    if (charger.station.status !== 'approved') throw new AppError('STATION_NOT_APPROVED', 409);

    assertValidSlot(startAt, input.durationMinutes, charger.station.openingHours);

    const existingUpcoming = await tx.booking.findFirst({
      where: { customerId, status: 'booked' },
      select: { id: true },
    });
    if (existingUpcoming) throw new AppError('BOOKING_EXISTS', 409);

    const overlapping = await tx.booking.findFirst({
      where: {
        chargerId: input.chargerId,
        // A booking the customer has already started charging on still holds its slot.
        status: { in: ['booked', 'used'] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (overlapping) throw new AppError('SLOT_TAKEN', 409);

    // Booking is free for now – no credit hold. A booking fee/deposit could later be taken
    // here with credit.hold and released on cancel or forfeited on no-show/expiry.
    const booking = await tx.booking.create({
      data: {
        customerId,
        chargerId: input.chargerId,
        stationId: charger.stationId,
        startAt,
        endAt,
        status: 'booked',
      },
    });
    return { booking, ownerId: charger.station.ownerId };
  });

  broadcastBookingChanged(booking.chargerId, booking.stationId, booking.startAt);
  await notify({
    userId: ownerId,
    title: 'New booking',
    body: 'A customer booked one of your chargers.',
    type: 'booking_made',
    refId: booking.id,
  });
  return plainBooking(booking);
}

export async function listMyBookings(customerId: string) {
  const bookings = await prisma.booking.findMany({
    where: { customerId },
    include: { charger: true, station: { select: { name: true } } },
    orderBy: { startAt: 'desc' },
    take: 100,
  });
  return bookings.map((booking) => ({
    ...plainBooking(booking),
    stationName: booking.station.name,
    chargerLabel: booking.charger.label,
    connector: booking.charger.connector,
  }));
}

export async function cancelBooking(id: string, customerId: string) {
  const { booking, ownerId } = await withTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${id} FOR UPDATE`;
    const current = await tx.booking.findUnique({ where: { id }, include: { station: true } });
    if (!current) throw new AppError('BOOKING_NOT_FOUND', 404);
    if (current.customerId !== customerId) throw new AppError('NOT_ALLOWED', 403);
    if (current.status !== 'booked' || current.startAt.getTime() <= Date.now()) {
      throw new AppError('BOOKING_NOT_CANCELLABLE', 409);
    }

    const booking = await tx.booking.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
    return { booking, ownerId: current.station.ownerId };
  });

  broadcastBookingChanged(booking.chargerId, booking.stationId, booking.startAt);
  await notify({
    userId: ownerId,
    title: 'Booking cancelled',
    body: 'A customer cancelled their booking on one of your chargers.',
    type: 'booking_cancelled',
    refId: booking.id,
  });
  return plainBooking(booking);
}

const HISTORY_DAYS = 30;

// The last 30 days of bookings on an owner's chargers, newest first, in every status. A booking
// the customer charged on also carries that session's energy and what the owner earned from it.
export async function listOwnerBookingHistory(ownerId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      station: { ownerId },
      startAt: { gte: since },
      // Still-booked future slots are the upcoming list; everything else (started, cancelled,
      // missed or charged) belongs to history, including a cancellation for a later date.
      OR: [{ status: { not: 'booked' } }, { startAt: { lte: now } }],
    },
    include: { charger: true, station: { select: { name: true } }, customer: { select: { fullName: true } } },
    orderBy: { startAt: 'desc' },
  });

  const sessionIds = bookings.map((booking) => booking.sessionId).filter((id): id is string => !!id);
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: { id: true, kwh: true, cost: true, commission: true },
      })
    : [];
  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  return bookings.map((booking) => {
    const session = booking.sessionId ? sessionById.get(booking.sessionId) : undefined;
    const cost = session?.cost ? Number(session.cost) : null;
    const commission = session?.commission ? Number(session.commission) : 0;
    return {
      ...plainBooking(booking),
      stationName: booking.station.name,
      chargerLabel: booking.charger.label,
      connector: booking.charger.connector,
      customerName: booking.customer.fullName,
      kwh: session?.kwh ? Number(session.kwh) : null,
      earned: cost === null ? null : Math.round((cost - commission) * 100) / 100,
    };
  });
}

export async function listOwnerBookings(ownerId: string) {
  const bookings = await prisma.booking.findMany({
    where: { station: { ownerId }, status: 'booked' },
    include: { charger: true, station: { select: { name: true } }, customer: { select: { fullName: true } } },
    orderBy: { startAt: 'asc' },
  });
  return bookings.map((booking) => ({
    ...plainBooking(booking),
    stationName: booking.station.name,
    chargerLabel: booking.charger.label,
    customerName: booking.customer.fullName,
  }));
}
