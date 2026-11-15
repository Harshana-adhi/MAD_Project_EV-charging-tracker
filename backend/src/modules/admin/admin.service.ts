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
import { notify } from '../../core/notify.service';
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
    createdAt: user.createdAt,
  };
}

export async function getCounts() {
  const [pendingStations, pendingTopups, pendingWithdrawals, users] = await Promise.all([
    prisma.station.count({ where: { status: 'pending' } }),
    prisma.topupRequest.count({ where: { status: 'pending', method: 'slip' } }),
    prisma.withdrawal.count({ where: { status: 'pending' } }),
    prisma.user.count(),
  ]);
  return { pendingStations, pendingTopups, pendingWithdrawals, users };
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

  // The status filter makes sure a station that was just reviewed cannot be reviewed again.
  const result = await prisma.station.updateMany({
    where: { id: stationId, status: 'pending' },
    data: input.approve
      ? { status: 'approved', rejectReason: null }
      : { status: 'rejected', rejectReason: input.reason },
  });
  if (result.count === 0) throw new AppError('ALREADY_PROCESSED', 409);

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

  const user = await prisma.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  return toPublicUser(user);
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
