import { prisma } from './db';
import { broadcast } from './socket';

// Duplicated from stations.service.ts's getStationStatusCounts, to avoid an import cycle
// (that file imports this one too, to sweep walk-ins before reading stations/chargers).
async function stationStatusCounts(stationId: string) {
  const chargers = await prisma.charger.findMany({ where: { stationId }, select: { status: true } });
  const availableCount = chargers.filter((c) => c.status === 'available').length;
  const onlineCount = chargers.filter((c) => c.status !== 'offline').length;
  return { availableCount, onlineCount };
}

// A walk-in charger with a busyUntil that has passed goes back to available on its own –
// the owner set it by hand for an offline charge, so nothing else ever ends it otherwise.
export async function runChargerSweep(): Promise<void> {
  const now = new Date();
  const due = await prisma.charger.findMany({
    where: { status: 'walkin', busyUntil: { lte: now } },
  });

  for (const charger of due) {
    const { count } = await prisma.charger.updateMany({
      where: { id: charger.id, status: 'walkin' },
      data: { status: 'available', busyUntil: null },
    });
    if (count === 0) continue;

    const counts = await stationStatusCounts(charger.stationId);
    broadcast('charger:status', {
      chargerId: charger.id,
      stationId: charger.stationId,
      status: 'available',
      ...counts,
    });
  }
}

export function startChargerJobs(): NodeJS.Timeout {
  return setInterval(() => {
    runChargerSweep().catch((err) => console.error('charger sweep failed', err));
  }, 60_000);
}
