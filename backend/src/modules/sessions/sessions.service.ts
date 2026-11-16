import { Prisma, type Session as DbSession } from '@prisma/client';
import { prisma, toNumber, withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import { credit } from '../../core/credit.service';
import { notify } from '../../core/notify.service';
import { broadcast, emitToUser } from '../../core/socket';
import { runBookingSweep } from '../../core/booking.jobs';
import { getStationStatusCounts } from '../stations/stations.service';
import { broadcastBookingChanged } from '../bookings/slots';
import { findGuardingBooking } from '../bookings/bookings.service';
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
    ratePerKwh: toNumber(session.charger.ratePerKwh)!,
    customerName: session.customer.fullName,
    hasReview: session.review !== null,
  };
}

async function publishStatus(session: DbSession, ownerId: string, status: 'busy' | 'available') {
  // Sends the station's freshly-counted available/online totals rather than letting
  // clients try to derive them by incrementing – they can't do that correctly without
  // knowing each charger's previous status.
  const counts = await getStationStatusCounts(session.stationId);
  broadcast('charger:status', {
    chargerId: session.chargerId,
    stationId: session.stationId,
    status,
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
  const wallet = await credit.getWallet(customerId);
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

  let usedBooking: { id: string; chargerId: string; stationId: string; startAt: Date } | null = null;
  const { session, ownerId } = await withTx(async (tx) => {
    // These locks prevent concurrent starts by one customer or on one charger.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${customerId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM chargers WHERE qr_token = ${input.qrToken} FOR UPDATE`;
    const charger = await tx.charger.findUnique({
      where: { qrToken: input.qrToken },
      include: { station: true },
    });
    if (!charger) throw new AppError('CHARGER_NOT_FOUND', 404);
    if (charger.station.status !== 'approved') throw new AppError('STATION_NOT_APPROVED', 409);
    if (charger.status === 'offline') throw new AppError('CHARGER_OFFLINE', 409);
    if (charger.status === 'busy') throw new AppError('CHARGER_BUSY', 409);
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

    const session = await tx.session.create({
      data: {
        customerId,
        chargerId: charger.id,
        stationId: charger.stationId,
        spendingLimit: input.spendingLimit,
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

    if (guarding && guarding.customerId === customerId) {
      await tx.booking.update({ where: { id: guarding.id }, data: { status: 'used', sessionId: session.id } });
      usedBooking = { id: guarding.id, chargerId: guarding.chargerId, stationId: guarding.stationId, startAt: guarding.startAt };
    }
    return { session, ownerId: charger.station.ownerId };
  });

  await publishStatus(session, ownerId, 'busy');
  if (usedBooking) broadcastBookingChanged(usedBooking.chargerId, usedBooking.stationId, usedBooking.startAt);
  await Promise.allSettled([credit.emitWalletUpdates([customerId])]);
  return plainSession(session);
}

export async function endSession(id: string, customerId: string) {
  const { session, ownerId, stationName, chargerLabel, kwh } = await withTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${id} FOR UPDATE`;
    const current = await tx.session.findUnique({
      where: { id },
      include: { charger: true, station: true },
    });
    if (!current) throw new AppError('SESSION_NOT_FOUND', 404);
    if (current.customerId !== customerId) throw new AppError('NOT_ALLOWED', 403);
    if (current.status !== 'active') throw new AppError('SESSION_NOT_ACTIVE', 409);

    const endedAt = new Date();
    const kwh = meteredKwh(
      current.charger.powerKw.toNumber(),
      current.charger.ratePerKwh.toNumber(),
      current.spendingLimit.toNumber(),
      current.startedAt,
      endedAt,
    );
    const cost = calculateCost(
      kwh,
      current.charger.ratePerKwh.toNumber(),
      current.spendingLimit.toNumber(),
    );
    const { commission } = await credit.settleSession(tx, {
      sessionId: id,
      customerId,
      ownerId: current.station.ownerId,
      heldAmount: current.spendingLimit.toNumber(),
      cost,
    });
    const session = await tx.session.update({
      where: { id },
      data: { status: 'completed', kwh, cost, commission, endedAt },
    });
    await tx.charger.update({ where: { id: current.chargerId }, data: { status: 'available' } });
    return { session, ownerId: current.station.ownerId, stationName: current.station.name, chargerLabel: current.charger.label, kwh };
  });

  await publishStatus(session, ownerId, 'available');
  const cost = session.cost!.toNumber();
  const commission = session.commission!.toNumber();
  await Promise.allSettled([
    credit.emitWalletUpdates([customerId, ownerId]),
    notify({
      userId: customerId,
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

export async function cancelSession(id: string, customerId: string) {
  const { session, ownerId } = await withTx(async (tx) => {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${id} FOR UPDATE`;
    const current = await tx.session.findUnique({ where: { id }, include: { station: true } });
    if (!current) throw new AppError('SESSION_NOT_FOUND', 404);
    if (current.customerId !== customerId) throw new AppError('NOT_ALLOWED', 403);
    if (current.status !== 'active') throw new AppError('SESSION_NOT_ACTIVE', 409);

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
    await tx.charger.update({ where: { id: current.chargerId }, data: { status: 'available' } });
    return { session, ownerId: current.station.ownerId };
  });

  await publishStatus(session, ownerId, 'available');
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