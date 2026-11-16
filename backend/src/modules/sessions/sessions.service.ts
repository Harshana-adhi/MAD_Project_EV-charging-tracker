import { Prisma, type Session as DbSession } from '@prisma/client';
import { prisma, toNumber, withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import { credit } from '../../core/credit.service';
import { notify } from '../../core/notify.service';
import { broadcast, emitToUser } from '../../core/socket';
import { runBookingSweep } from '../../core/booking.jobs';
import { runChargerSweep } from '../../core/charger.jobs';
import { getStationStatusCounts } from '../stations/stations.service';
import { broadcastBookingChanged } from '../bookings/slots';
import { findGuardingBooking } from '../bookings/bookings.service';
import { cancelSessionAutoEnd, scheduleSessionAutoEnd } from '../../core/sessionTimers';
import type { AuthUser } from '../../core/auth.middleware';

const sessionInclude = {
  charger: true,
  station: true,
  customer: true,
  review: true,
} satisfies Prisma.SessionInclude;

type SessionDetails = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

// The demo meter runs 60 times faster than real time (one real second is one charging minute).
// It must match SPEED in mobile/src/features/session/meterReading.ts.
const METER_SPEED = 60;
const CANCEL_LIMIT_KWH = 0.05;

// The energy is worked out on the server from the charger's power and how long the session ran,
// so a modified app cannot report less energy than was delivered. It never goes beyond what the
// spending limit can pay for, because the meter stops there.
export function meteredKwh(
  powerKw: number,
  ratePerKwh: number,
  spendingLimit: number,
  startedAt: Date,
  endedAt: Date,
): number {
  const elapsedMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const delivered = (powerKw * elapsedMs * METER_SPEED) / 3_600_000;
  const affordable = spendingLimit / ratePerKwh;
  return Math.max(0.01, Math.floor(Math.min(delivered, affordable) * 100) / 100);
}

// Real-world milliseconds from "now" until the meter (run at METER_SPEED from startedAt)
// reaches the energy the spending limit affords. Zero or negative means it already has.
export function msUntilSpendingLimit(
  powerKw: number,
  ratePerKwh: number,
  spendingLimit: number,
  startedAt: Date,
  now: Date,
): number {
  const affordable = spendingLimit / ratePerKwh;
  const requiredMs = (affordable * 3_600_000) / (powerKw * METER_SPEED);
  const elapsedMs = now.getTime() - startedAt.getTime();
  return requiredMs - elapsedMs;
}

// meteredKwh/calculateCost round down to the cent for billing, so a capped session's cost
// settles just under spendingLimit (e.g. 99.45, never exactly 100) – checking cost against
// spendingLimit directly would never trigger. This compares the unrounded figures instead.
export function hasReachedSpendingLimit(
  powerKw: number,
  ratePerKwh: number,
  spendingLimit: number,
  startedAt: Date,
  now: Date,
): boolean {
  return msUntilSpendingLimit(powerKw, ratePerKwh, spendingLimit, startedAt, now) <= 0;
}

export function calculateCost(kwh: number, ratePerKwh: number, spendingLimit: number): number {
  const energyHundredths = Math.round(kwh * 100);
  const rateCents = Math.round(ratePerKwh * 100);
  const limitCents = Math.round(spendingLimit * 100);
  return Math.min(Math.round((energyHundredths * rateCents) / 100), limitCents) / 100;
}

function plainSession(session: DbSession) {
  return {
    id: session.id,
    customerId: session.customerId,
    chargerId: session.chargerId,
    stationId: session.stationId,
    spendingLimit: toNumber(session.spendingLimit)!,
    kwh: toNumber(session.kwh),
    cost: toNumber(session.cost),
    commission: toNumber(session.commission),
    status: session.status,
    disputeReason: session.disputeReason,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
  };
}

function withNames(session: SessionDetails) {
  return {
    ...plainSession(session),
    stationName: session.station.name,
    chargerLabel: session.charger.label,
    connector: session.charger.connector,
    powerKw: toNumber(session.charger.powerKw)!,
    ratePerKwh: toNumber(session.ratePerKwh ?? session.charger.ratePerKwh)!,
    customerName: session.customer.fullName,
    hasReview: session.review !== null,
  };
}

async function publishStatus(session: DbSession, ownerId: string) {
  // Sends the station's freshly-counted available/online totals rather than letting
  // clients try to derive them by incrementing – they can't do that correctly without
  // knowing each charger's previous status.
  const counts = await getStationStatusCounts(session.stationId);
  const charger = await prisma.charger.findUnique({ where: { id: session.chargerId }, select: { status: true } });
  broadcast('charger:status', {
    chargerId: session.chargerId,
    stationId: session.stationId,
    status: charger?.status ?? 'available',
    ...counts,
  });
  const payload = plainSession(session);
  emitToUser(session.customerId, 'session:updated', payload);
  emitToUser(ownerId, 'session:updated', payload);
}

function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export async function getChargerByQr(qrToken: string, customerId: string) {
  const charger = await prisma.charger.findUnique({ where: { qrToken }, include: { station: true } });
  if (!charger) throw new AppError('CHARGER_NOT_FOUND', 404);
  if (charger.station.status !== 'approved') throw new AppError('STATION_NOT_APPROVED', 409);
  if (charger.station.ownerId === customerId) throw new AppError('OWN_STATION', 409);
  const wallet = await credit.getWallet(customerId);
  const guarding = await findGuardingBooking(prisma, charger.id, new Date());
  return {
    charger: {
      id: charger.id,
      stationId: charger.stationId,
      label: charger.label,
      connector: charger.connector,
      powerKw: toNumber(charger.powerKw)!,
      ratePerKwh: toNumber(charger.ratePerKwh)!,
      status: charger.status,
      qrToken: charger.qrToken,
      // Set when another customer's booking holds this charger right now.
      reservedUntil: guarding && guarding.customerId !== customerId ? guarding.endAt.toISOString() : null,
    },
    station: { id: charger.station.id, name: charger.station.name, address: charger.station.address },
    available: wallet.available,
  };
}

export async function startSession(customerId: string, input: { qrToken: string; spendingLimit: number }) {
  const chargerForSweep = await prisma.charger.findUnique({
    where: { qrToken: input.qrToken },
    select: { id: true },
  });
  if (chargerForSweep) await runBookingSweep();
  await runChargerSweep();

  const { session, ownerId, usedBooking, powerKw, ratePerKwh } = await withTx(async (tx) => {
    // These locks prevent concurrent starts by one customer or on one charger.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${customerId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM chargers WHERE qr_token = ${input.qrToken} FOR UPDATE`;
    const charger = await tx.charger.findUnique({
      where: { qrToken: input.qrToken },
      include: { station: true },
    });
    if (!charger) throw new AppError('CHARGER_NOT_FOUND', 404);
    if (charger.station.status !== 'approved') throw new AppError('STATION_NOT_APPROVED', 409);
    if (charger.station.ownerId === customerId) throw new AppError('OWN_STATION', 409);
    if (charger.status === 'offline') throw new AppError('CHARGER_OFFLINE', 409);
    if (charger.status === 'busy') throw new AppError('CHARGER_BUSY', 409);
    if (charger.status === 'walkin') throw new AppError('CHARGER_IN_USE', 409);

    // A customer with saved vehicles can only start on a plug at least one of them takes.
    // Someone with no saved vehicles (an owner charging, say) is not blocked – we can't tell.
    const vehicles = await tx.vehicle.findMany({ where: { userId: customerId }, select: { connector: true } });
    if (vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.connector === charger.connector)) {
      throw new AppError('CONNECTOR_MISMATCH', 409);
    }
    const active = await tx.session.findFirst({
      where: { customerId, status: 'active' },
      select: { id: true },
    });
    if (active) throw new AppError('ACTIVE_SESSION_EXISTS', 409);

    // A booking guards its charger from start-5min to the end of the slot – someone
    // else's booking blocks this scan outright; the customer's own booking lets it
    // through and is marked used below once the session exists.
    const guarding = await findGuardingBooking(tx, charger.id, new Date());
    if (guarding && guarding.customerId !== customerId) {
      throw new AppError('CHARGER_RESERVED', 409);
    }

    // The session must be able to finish before the next customer's booking starts.
    const now = new Date();
    const nextBooking = await tx.booking.findFirst({
      where: { chargerId: charger.id, status: 'booked', customerId: { not: customerId }, startAt: { gt: now } },
      orderBy: { startAt: 'asc' },
    });
    if (nextBooking) {
      const neededMs = msUntilSpendingLimit(
        toNumber(charger.powerKw)!,
        toNumber(charger.ratePerKwh)!,
        input.spendingLimit,
        now,
        now,
      );
      if (now.getTime() + neededMs > nextBooking.startAt.getTime()) {
        throw new AppError('BOOKING_STARTS_SOON', 409);
      }
    }

    const session = await tx.session.create({
      data: {
        customerId,
        chargerId: charger.id,
        stationId: charger.stationId,
        spendingLimit: input.spendingLimit,
        ratePerKwh: charger.ratePerKwh,
        status: 'active',
      },
    });
    await credit.hold(tx, {
      userId: customerId,
      amount: input.spendingLimit,
      refType: 'session',
      refId: session.id,
    });
    await tx.charger.update({ where: { id: charger.id }, data: { status: 'busy' } });

    let usedBooking: { chargerId: string; stationId: string; startAt: Date } | null = null;
    if (guarding && guarding.customerId === customerId) {
      await tx.booking.update({ where: { id: guarding.id }, data: { status: 'used', sessionId: session.id } });
      usedBooking = { chargerId: guarding.chargerId, stationId: guarding.stationId, startAt: guarding.startAt };
    }
    return {
      session,
      ownerId: charger.station.ownerId,
      usedBooking,
      powerKw: toNumber(charger.powerKw)!,
      ratePerKwh: toNumber(charger.ratePerKwh)!,
    };
  });

  await publishStatus(session, ownerId);
  if (usedBooking) broadcastBookingChanged(usedBooking.chargerId, usedBooking.stationId, usedBooking.startAt);
  await Promise.allSettled([credit.emitWalletUpdates([customerId])]);

  // Ends this exact session the instant its spending limit is reached, instead of
  // waiting for the next periodic sweep – the charger frees up with no visible delay.
  scheduleSessionAutoEnd(
    session.id,
    msUntilSpendingLimit(powerKw, ratePerKwh, input.spendingLimit, session.startedAt, new Date()),
    () => {
      endSession(session.id).catch((err) => console.error('session auto-end failed', session.id, err));
    },
  );

  return plainSession(session);
}

// customerId is omitted when the system itself ends the session (the spending limit was
// reached) rather than the customer pressing Stop – everything else about ending it is
// the same either way.
export async function endSession(id: string, customerId?: string) {
  const { session, ownerId, stationName, chargerLabel, kwh } = await withTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${id} FOR UPDATE`;
    const current = await tx.session.findUnique({
      where: { id },
      include: { charger: true, station: true },
    });
    if (!current) throw new AppError('SESSION_NOT_FOUND', 404);
    if (customerId && current.customerId !== customerId) throw new AppError('NOT_ALLOWED', 403);
    if (current.status !== 'active') throw new AppError('SESSION_NOT_ACTIVE', 409);

    const endedAt = new Date();
    // Billed at the rate fixed when the session started, even if the owner changed it since.
    const ratePerKwh = (current.ratePerKwh ?? current.charger.ratePerKwh).toNumber();
    const kwh = meteredKwh(
      current.charger.powerKw.toNumber(),
      ratePerKwh,
      current.spendingLimit.toNumber(),
      current.startedAt,
      endedAt,
    );
    const cost = calculateCost(kwh, ratePerKwh, current.spendingLimit.toNumber());
    const { commission } = await credit.settleSession(tx, {
      sessionId: id,
      customerId: current.customerId,
      ownerId: current.station.ownerId,
      heldAmount: current.spendingLimit.toNumber(),
      cost,
    });
    const session = await tx.session.update({
      where: { id },
      data: { status: 'completed', kwh, cost, commission, endedAt },
    });
    // Only a charger this session made busy goes back to available.
    await tx.charger.updateMany({ where: { id: current.chargerId, status: 'busy' }, data: { status: 'available' } });
    return { session, ownerId: current.station.ownerId, stationName: current.station.name, chargerLabel: current.charger.label, kwh };
  });

  cancelSessionAutoEnd(id);
  await publishStatus(session, ownerId);
  const cost = session.cost!.toNumber();
  const commission = session.commission!.toNumber();
  await Promise.allSettled([
    credit.emitWalletUpdates([session.customerId, ownerId]),
    notify({
      userId: session.customerId,
      title: 'Charging session invoice',
      body: `${stationName} – ${chargerLabel}\nEnergy: ${kwh.toFixed(2)} kWh\nTotal charged: ${formatLkr(cost)}`,
      type: 'session_completed',
      refId: id,
      email: true,
    }),
    notify({
      userId: ownerId,
      title: 'You earned from a charging session',
      body: `${stationName} – ${chargerLabel}\nSession total: ${formatLkr(cost)} (platform fee ${formatLkr(commission)})\nAdded to your wallet: ${formatLkr(cost - commission)}`,
      type: 'session_completed',
      refId: id,
      email: true,
    }),
  ]);
  return plainSession(session);
}

// True once the meter has delivered 0.05 kWh – the same point where the app swaps
// "Cancel session" for "Stop charging".
function hasStartedCharging(powerKw: number, startedAt: Date): boolean {
  const elapsedMs = Date.now() - startedAt.getTime();
  return (powerKw * elapsedMs * METER_SPEED) / 3_600_000 >= CANCEL_LIMIT_KWH;
}

export async function cancelSession(id: string, customerId: string) {
  // A full refund is only for a session that has barely started. Once energy has been
  // delivered, cancelling works like stopping: the customer pays for what was used so far
  // and the rest of the hold is returned.
  const started = await prisma.session.findUnique({ where: { id }, include: { charger: true } });
  if (
    started &&
    started.customerId === customerId &&
    started.status === 'active' &&
    hasStartedCharging(started.charger.powerKw.toNumber(), started.startedAt)
  ) {
    return endSession(id, customerId);
  }

  const { session, ownerId } = await withTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${id} FOR UPDATE`;
    const current = await tx.session.findUnique({ where: { id }, include: { station: true, charger: true } });
    if (!current) throw new AppError('SESSION_NOT_FOUND', 404);
    if (current.customerId !== customerId) throw new AppError('NOT_ALLOWED', 403);
    if (current.status !== 'active') throw new AppError('SESSION_NOT_ACTIVE', 409);

    // Lost the race with the check above: charging got going in the meantime.
    if (hasStartedCharging(current.charger.powerKw.toNumber(), current.startedAt)) {
      throw new AppError('CANCEL_NOT_ALLOWED', 409);
    }

    await credit.release(tx, {
      userId: customerId,
      amount: current.spendingLimit.toNumber(),
      refType: 'session',
      refId: id,
    });
    const session = await tx.session.update({
      where: { id },
      data: { status: 'cancelled', endedAt: new Date() },
    });
    // Only a charger this session made busy goes back to available.
    await tx.charger.updateMany({ where: { id: current.chargerId, status: 'busy' }, data: { status: 'available' } });
    return { session, ownerId: current.station.ownerId };
  });

  cancelSessionAutoEnd(id);
  await publishStatus(session, ownerId);
  await Promise.allSettled([
    credit.emitWalletUpdates([customerId]),
    notify({
      userId: customerId,
      title: 'Session cancelled',
      body: 'Session cancelled – credits returned',
      type: 'session_cancelled',
      refId: id,
    }),
  ]);
  return plainSession(session);
}

export async function getActiveSession(customerId: string) {
  const session = await prisma.session.findFirst({
    where: { customerId, status: 'active' },
    include: sessionInclude,
    orderBy: { startedAt: 'desc' },
  });
  return session ? withNames(session) : null;
}

export async function listMySessions(customerId: string) {
  const sessions = await prisma.session.findMany({
    where: { customerId },
    include: sessionInclude,
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  return sessions.map(withNames);
}

export async function getSession(id: string, requester: AuthUser) {
  const session = await prisma.session.findUnique({ where: { id }, include: sessionInclude });
  if (!session) throw new AppError('SESSION_NOT_FOUND', 404);
  const allowed =
    session.customerId === requester.id ||
    session.station.ownerId === requester.id ||
    requester.role === 'admin';
  if (!allowed) throw new AppError('NOT_ALLOWED', 403);
  return withNames(session);
}