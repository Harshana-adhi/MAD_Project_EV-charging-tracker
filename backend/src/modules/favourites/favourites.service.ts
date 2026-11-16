import { prisma, withTx } from '../../core/db';
import { AppError } from '../../core/errors';
import { summariseStations } from '../stations/stations.service';

export async function listFavourites(userId: string) {
  const favourites = await prisma.favourite.findMany({
    where: { userId, station: { status: 'approved' } },
    orderBy: [{ createdAt: 'desc' }, { stationId: 'asc' }],
    select: {
      station: { include: { chargers: true, reviews: { select: { rating: true } } } },
    },
  });
  return summariseStations(favourites.map(({ station }) => station));
}

export async function toggleFavourite(userId: string, stationId: string) {
  return withTx(async (tx) => {
    // Serialize toggles for the same customer and station.
    await tx.$queryRaw`
      SELECT 1
      FROM pg_advisory_xact_lock(hashtext(${userId}), hashtext(${stationId}))
    `;
    const station = await tx.station.findFirst({
      where: { id: stationId, status: 'approved' },
      select: { id: true },
    });
    if (!station) throw new AppError('NOT_FOUND', 404);

    const key = { userId, stationId };
    const removed = await tx.favourite.deleteMany({ where: key });
    if (removed.count > 0) return { favourite: false };

    await tx.favourite.create({ data: key });
    return { favourite: true };
  });
}
