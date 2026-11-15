import type { Station, StationStatus, User } from '@prisma/client';
import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import type { AuthUser } from '../../core/auth.middleware';
import { hashPassword } from '../../core/password';
import { notify } from '../../core/notify.service';
import type { ReviewInput } from './admin.schema';

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
  });

  const updated = await prisma.station.findUniqueOrThrow({ where: { id: stationId } });
  return toStation(updated);
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
