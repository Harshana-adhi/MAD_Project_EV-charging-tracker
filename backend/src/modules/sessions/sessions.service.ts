import type { Session } from '@prisma/client';
import { prisma, withTx, toNumber } from '../../core/db';
import { AppError } from '../../core/errors';
import { credit } from '../../core/credit.service';
import { broadcast, emitToUser } from '../../core/socket';
import { notify } from '../../core/notify.service';
import type { StartSessionInput, StopSessionInput } from './sessions.schema';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function toSession(session: Session) {
  return {
    id: session.id,
    customerId: session.customerId,
    chargerId: session.chargerId,
    stationId: session.stationId,
    spendingLimit: toNumber(session.spendingLimit),
    kwh: toNumber(session.kwh),
    cost: toNumber(session.cost),
    commission: toNumber(session.commission),
    status: session.status,
    disputeReason: session.disputeReason,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

async function findActiveSessionForCustomer(customerId: string, sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.customerId !== customerId) throw new AppError('NOT_FOUND', 404);
  if (session.status !== 'active') throw new AppError('SESSION_NOT_ACTIVE', 409);
  return session;
}

export async function startSession(customerId: string, input: StartSessionInput) {
  const charger = await prisma.charger.findUnique({
    where: { qrToken: input.qrToken },
    include: { station: true },
  });
  if (!charger) throw new AppError('NOT_FOUND', 404, 'Charger not found');
  if (charger.station.status !== 'approved') throw new AppError('NOT_ALLOWED', 403, 'Station not available');
  if (charger.status !== 'available') throw new AppError('CHARGER_BUSY', 409, 'Charger is not available');

  const existing = await prisma.session.findFirst({
    where: { customerId, status: 'active' },
  });
  if (existing) throw new AppError('SESSION_ACTIVE', 409, 'You already have an active charging session');

  const session = await withTx(async (tx) => {
    const created = await tx.session.create({
      data: {
        customerId,
        chargerId: charger.id,
        stationId: charger.stationId,
        spendingLimit: input.spendingLimit,
        status: 'active',
      },
    });
    await tx.charger.update({ where: { id: charger.id }, data: { status: 'busy' } });
    await credit.hold(tx, {
      userId: customerId,
      amount: input.spendingLimit,
      refType: 'session',
      refId: created.id,
    });
    return created;
  });

  broadcast('charger:status', { chargerId: charger.id, status: 'busy' });
  await credit.emitWalletUpdates([customerId]);

  return toSession(session);
}

export async function stopSession(customerId: string, sessionId: string, input: StopSessionInput) {
  const session = await findActiveSessionForCustomer(customerId, sessionId);
  const charger = await prisma.charger.findUniqueOrThrow({
    where: { id: session.chargerId },
    include: { station: true },
  });
  const spendingLimit = toNumber(session.spendingLimit) as number;
  const rate = toNumber(charger.ratePerKwh) as number;
  const kwh = round2(input.kwh);
  const cost = Math.min(round2(kwh * rate), spendingLimit);

  const { updated, commission } = await withTx(async (tx) => {
    const { commission } = await credit.settleSession(tx, {
      sessionId,
      customerId,
      ownerId: charger.station.ownerId,
      heldAmount: spendingLimit,
      cost,
    });
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { kwh, cost, commission, status: 'completed', endedAt: new Date() },
    });
    await tx.charger.update({ where: { id: charger.id }, data: { status: 'available' } });
    return { updated, commission };
  });

  broadcast('charger:status', { chargerId: charger.id, status: 'available' });
  await credit.emitWalletUpdates([customerId, charger.station.ownerId]);
  emitToUser(customerId, 'session:updated', toSession(updated));
  emitToUser(charger.station.ownerId, 'session:updated', toSession(updated));

  const ownerEarning = round2(cost - commission);
  await notify({
    userId: customerId,
    title: 'Charging session invoice',
    body:
      `${charger.station.name} – ${charger.label}\n` +
      `Energy: ${kwh.toFixed(2)} kWh at ${formatLkr(rate)}/kWh\n` +
      `Total charged: ${formatLkr(cost)}`,
    type: 'session_invoice',
    refId: sessionId,
    email: true,
  });
  await notify({
    userId: charger.station.ownerId,
    title: 'You earned from a charging session',
    body:
      `${charger.station.name} – ${charger.label}\n` +
      `Session total: ${formatLkr(cost)} (platform fee ${formatLkr(commission)})\n` +
      `Added to your wallet: ${formatLkr(ownerEarning)}`,
    type: 'session_earning',
    refId: sessionId,
    email: true,
  });

  return toSession(updated);
}

export async function cancelSession(customerId: string, sessionId: string) {
  const session = await findActiveSessionForCustomer(customerId, sessionId);
  const spendingLimit = toNumber(session.spendingLimit) as number;

  const updated = await withTx(async (tx) => {
    await credit.release(tx, {
      userId: customerId,
      amount: spendingLimit,
      refType: 'session',
      refId: sessionId,
    });
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { status: 'cancelled', endedAt: new Date() },
    });
    await tx.charger.update({ where: { id: session.chargerId }, data: { status: 'available' } });
    return updated;
  });

  broadcast('charger:status', { chargerId: session.chargerId, status: 'available' });
  await credit.emitWalletUpdates([customerId]);
  return toSession(updated);
}

export async function getSession(userId: string, role: string, sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { station: { select: { ownerId: true } } },
  });
  if (!session) throw new AppError('NOT_FOUND', 404);
  const allowed =
    session.customerId === userId || session.station.ownerId === userId || role === 'admin';
  if (!allowed) throw new AppError('NOT_ALLOWED', 403);
  return toSession(session);
}

export async function listMySessions(customerId: string) {
  const sessions = await prisma.session.findMany({
    where: { customerId },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  return sessions.map(toSession);
}
