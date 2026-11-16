import type {
  RequestStatus,
  Station,
  StationStatus,
  TopupRequest,
  User,
  Withdrawal,
  WithdrawalStatus,
} from '@prisma/client';
import { prisma, withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import type { AuthUser } from '../../core/auth.middleware';
import { hashPassword } from '../../core/password';
import { credit } from '../../core/credit.service';
import { broadcastStationChanged, takeStationOffMap } from '../stations/stations.service';
import { notify } from '../../core/notify.service';
import { endSession } from '../sessions/sessions.service';
import { broadcastBookingChanged } from '../bookings/slots';
import type { ReviewInput } from './admin.schema';

function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isBlocked: user.isBlocked,
    isDeleted: !!user.deletedAt,
    createdAt: user.createdAt,
  };
}

export async function getCounts() {
  const [pendingStations, pendingTopups, pendingWithdrawals, pendingDisputes, users] = await Promise.all([
    prisma.station.count({ where: { status: 'pending' } }),
    prisma.topupRequest.count({ where: { status: 'pending', method: 'slip' } }),
    prisma.withdrawal.count({ where: { status: 'pending' } }),
    prisma.session.count({ where: { status: 'disputed' } }),
    prisma.user.count(),
  ]);
  return { pendingStations, pendingTopups, pendingWithdrawals, pendingDisputes, users };
}

function toStation(station: Station) {
  return {
    id: station.id,
    ownerId: station.ownerId,
    name: station.name,
    description: station.description,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    openingHours: station.openingHours,
    amenities: station.amenities,
    photos: station.photos,
    status: station.status,
    rejectReason: station.rejectReason,
    createdAt: station.createdAt,
  };
}

export async function listStationsByStatus(status: StationStatus) {
  const stations = await prisma.station.findMany({
    where: { status },
    include: { owner: { select: { fullName: true } }, _count: { select: { chargers: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return stations.map((station) => ({
    ...toStation(station),
    ownerName: station.owner.fullName,
    chargerCount: station._count.chargers,
  }));
}

export async function reviewStation(stationId: string, input: ReviewInput) {
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) throw new AppError('NOT_FOUND', 404);

  // A station with nothing to charge on would show up on the map empty.
  if (input.approve) {
    const chargers = await prisma.charger.count({ where: { stationId } });
    if (chargers === 0) throw new AppError('STATION_HAS_NO_CHARGERS', 409);
  }

  // The status filter makes sure a station that was just reviewed cannot be reviewed again.
  const result = await prisma.station.updateMany({
    where: { id: stationId, status: 'pending' },
    data: input.approve
      ? { status: 'approved', rejectReason: null }
      : { status: 'rejected', rejectReason: input.reason },
  });
  if (result.count === 0) throw new AppError('ALREADY_PROCESSED', 409);

  broadcastStationChanged(stationId, input.approve ? 'approved' : 'rejected');
  await notify({
    userId: station.ownerId,
    title: input.approve ? 'Station approved' : 'Station rejected',
    body: input.approve
      ? `${station.name} is now visible on the map`
      : `Station rejected: ${input.reason}`,
    type: 'station_review',
    refId: station.id,
    email: true,
  });

  const updated = await prisma.station.findUniqueOrThrow({ where: { id: stationId } });
  return toStation(updated);
}

export async function setStationHidden(stationId: string, hidden: boolean) {
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) throw new AppError('NOT_FOUND', 404);
  if (hidden && station.status !== 'approved') throw new AppError('ALREADY_PROCESSED', 409);
  if (!hidden && station.status !== 'hidden') throw new AppError('ALREADY_PROCESSED', 409);

  if (hidden) {
    // Same rule as an owner deleting a station: not while someone is charging there.
    const activeSession = await prisma.session.findFirst({
      where: { stationId, status: 'active' },
      select: { id: true },
    });
    if (activeSession) throw new AppError('STATION_HAS_ACTIVE_SESSION', 409);
    await takeStationOffMap(stationId, 'hidden');
  } else {
    await prisma.station.update({ where: { id: stationId }, data: { status: 'approved' } });
    broadcastStationChanged(stationId, 'approved');
  }

  await notify({
    userId: station.ownerId,
    title: hidden ? 'Station hidden' : 'Station reinstated',
    body: hidden
      ? `${station.name} was hidden from the map by an admin`
      : `${station.name} is visible on the map again`,
    type: 'station_review',
    refId: station.id,
    email: true,
  });

  const updated = await prisma.station.findUniqueOrThrow({ where: { id: stationId } });
  return toStation(updated);
}

function toTopup(request: TopupRequest) {
  return {
    id: request.id,
    amount: request.amount.toNumber(),
    method: request.method,
    slipUrl: request.slipUrl,
    status: request.status,
    reason: request.reason,
    createdAt: request.createdAt,
  };
}

export async function listTopups(status: RequestStatus) {
  const requests = await prisma.topupRequest.findMany({
    where: { status, method: 'slip' },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return requests.map((request) => ({ ...toTopup(request), userName: request.user.fullName }));
}

export async function reviewTopup(admin: AuthUser, topupId: string, input: ReviewInput) {
  const request = await prisma.topupRequest.findFirst({ where: { id: topupId, method: 'slip' } });
  if (!request) throw new AppError('NOT_FOUND', 404);
  const amount = request.amount.toNumber();

  const updated = await withTx(async (tx) => {
    // Updating only while the request is still pending stops the same slip being credited twice.
    const result = await tx.topupRequest.updateMany({
      where: { id: topupId, status: 'pending' },
      data: {
        status: input.approve ? 'approved' : 'rejected',
        reason: input.approve ? null : input.reason,
        reviewedBy: admin.id,
      },
    });
    if (result.count === 0) throw new AppError('ALREADY_PROCESSED', 409);

    if (input.approve) {
      await credit.credit(tx, {
        userId: request.userId,
        amount,
        type: 'topup',
        refType: 'topup',
        refId: topupId,
        note: 'Bank slip top-up',
      });
    }
    return tx.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  });

  if (input.approve) await credit.emitWalletUpdates([request.userId]);
  await notify({
    userId: request.userId,
    title: input.approve ? 'Top-up approved' : 'Top-up rejected',
    body: input.approve
      ? `${formatLkr(amount)} was added to your wallet`
      : `Your bank slip top-up of ${formatLkr(amount)} was rejected: ${input.reason}`,
    type: 'topup_review',
    refId: topupId,
    email: true,
  });

  return toTopup(updated);
}

function toWithdrawal(withdrawal: Withdrawal) {
  return {
    id: withdrawal.id,
    amount: withdrawal.amount.toNumber(),
    bankNote: withdrawal.bankNote,
    status: withdrawal.status,
    createdAt: withdrawal.createdAt,
  };
}

export async function listWithdrawals(status: WithdrawalStatus) {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { status },
    include: { owner: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return withdrawals.map((withdrawal) => ({
    ...toWithdrawal(withdrawal),
    ownerName: withdrawal.owner.fullName,
  }));
}

export async function processWithdrawal(admin: AuthUser, withdrawalId: string, approve: boolean) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!withdrawal) throw new AppError('NOT_FOUND', 404);
  const amount = withdrawal.amount.toNumber();

  const updated = await withTx(async (tx) => {
    // Updating only while the request is still pending stops it being paid or released twice.
    const result = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: 'pending' },
      data: { status: approve ? 'paid' : 'rejected', processedBy: admin.id },
    });
    if (result.count === 0) throw new AppError('ALREADY_PROCESSED', 409);

    if (approve) {
      await credit.payoutHeld(tx, { userId: withdrawal.ownerId, amount, withdrawalId });
    } else {
      await credit.release(tx, {
        userId: withdrawal.ownerId,
        amount,
        refType: 'withdrawal',
        refId: withdrawalId,
      });
    }
    return tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  });

  await credit.emitWalletUpdates([withdrawal.ownerId]);
  await notify({
    userId: withdrawal.ownerId,
    title: approve ? 'Withdrawal paid' : 'Withdrawal rejected',
    body: approve
      ? `Withdrawal of ${formatLkr(amount)} paid`
      : `Withdrawal of ${formatLkr(amount)} rejected – credits returned`,
    type: 'withdrawal_review',
    refId: withdrawalId,
    email: true,
  });

  return toWithdrawal(updated);
}

export async function listUsers(search?: string) {
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return users.map(toPublicUser);
}

export async function setUserBlocked(admin: AuthUser, userId: string, blocked: boolean) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError('NOT_FOUND', 404);
  if (target.id === admin.id || target.role === 'admin') throw new AppError('NOT_ALLOWED', 403);
  if (target.deletedAt) throw new AppError('ACCOUNT_DELETED', 409);

  const user = await prisma.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  if (blocked) await stopUserActivity(user);

  await notify({
    userId,
    title: blocked ? 'Account terminated' : 'Account reactivated',
    body: blocked
      ? 'Your GreenCharge account was terminated by an admin. You can no longer use the app.'
      : 'Your GreenCharge account is active again. You can log in and use the app.',
    type: 'account_status',
    email: true,
  });
  return toPublicUser(user);
}

// Sessions an owner has disputed and no admin has looked at yet.
export async function listDisputes() {
  const sessions = await prisma.session.findMany({
    where: { status: 'disputed' },
    include: {
      charger: { select: { label: true } },
      customer: { select: { fullName: true } },
      station: { select: { name: true, owner: { select: { fullName: true } } } },
    },
    orderBy: { endedAt: 'desc' },
  });
  return sessions.map((session) => ({
    id: session.id,
    stationName: session.station.name,
    chargerLabel: session.charger.label,
    ownerName: session.station.owner.fullName,
    customerName: session.customer.fullName,
    reason: session.disputeReason,
    kwh: session.kwh?.toNumber() ?? null,
    cost: session.cost?.toNumber() ?? null,
    endedAt: session.endedAt,
  }));
}

// Closing a dispute puts the session back to completed and tells both sides. No money moves:
// the admin settles anything owed with the owner and customer outside the app.
export async function resolveDispute(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { station: { select: { name: true, ownerId: true } } },
  });
  if (!session) throw new AppError('NOT_FOUND', 404);

  const result = await prisma.session.updateMany({
    where: { id: sessionId, status: 'disputed' },
    data: { status: 'completed' },
  });
  if (result.count === 0) throw new AppError('ALREADY_PROCESSED', 409);

  for (const userId of [session.station.ownerId, session.customerId]) {
    await notify({
      userId,
      title: 'Dispute closed',
      body: `An admin reviewed the disputed session at ${session.station.name} and closed the dispute.`,
      type: 'session_disputed',
      refId: sessionId,
      email: true,
    });
  }
  return { id: sessionId };
}

// A terminated user can't use the app, so nothing of theirs is left running: their own
// charging session ends, their bookings are cancelled and (for an owner) their stations are
// hidden. An admin reinstates the stations from the Hidden list after reactivating the owner.
async function stopUserActivity(user: User) {
  const activeSessions = await prisma.session.findMany({
    where: { customerId: user.id, status: 'active' },
    select: { id: true },
  });
  for (const session of activeSessions) {
    await endSession(session.id).catch((err) => console.error('Could not end session of terminated user', session.id, err));
  }

  const bookings = await prisma.booking.findMany({ where: { customerId: user.id, status: 'booked' } });
  await prisma.booking.updateMany({
    where: { customerId: user.id, status: 'booked' },
    data: { status: 'cancelled', cancelledAt: new Date() },
  });
  for (const booking of bookings) {
    broadcastBookingChanged(booking.chargerId, booking.stationId, booking.startAt);
  }

  if (user.role === 'owner') {
    const stations = await prisma.station.findMany({
      where: { ownerId: user.id, status: 'approved' },
      select: { id: true },
    });
    for (const station of stations) await takeStationOffMap(station.id, 'hidden');
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError('NOT_FOUND', 404);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await notify({
    userId,
    title: 'Password reset',
    body: 'Your password was reset by an admin',
    type: 'password_reset',
  });
  return { ok: true };
}
