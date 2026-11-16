import { Prisma, type Charger, type Station, type Withdrawal } from '@prisma/client';
import { assertOwner, type AuthUser } from '../../core/auth.middleware';
import { withTx, prisma, toNumber, type Tx } from '../../core/db';
import { AppError } from '../../core/errors';
import { notify, notifyAdmins } from '../../core/notify.service';
import { broadcast, emitToUser } from '../../core/socket';
import { credit } from '../../core/credit.service';
import { deleteCloudinaryAsset, uploadCloudinaryAsset } from '../../core/upload';
import { getStationStatusCounts } from '../stations/stations.service';
import { createChargerQrToken } from './owner.crypto';
import { connectorPowerProblem } from './owner.schema';
import type {
  ChargerInput,
  StationInput,
  UpdateChargerInput,
  UpdateStationInput,
} from './owner.schema';

type StationRelations = Station & {
  chargers: Charger[];
  reviews: { rating: number }[];
};

type OwnedCharger = Charger & { station: { ownerId: string } };

const ownerSessionInclude = {
  station: { select: { name: true } },
  charger: { select: { label: true, connector: true, powerKw: true, ratePerKwh: true } },
  customer: { select: { fullName: true } },
  review: { select: { id: true } },
} satisfies Prisma.SessionInclude;

type OwnerSession = Prisma.SessionGetPayload<{ include: typeof ownerSessionInclude }>;

function toCharger(charger: Charger) {
  return {
    id: charger.id,
    stationId: charger.stationId,
    label: charger.label,
    connector: charger.connector,
    powerKw: toNumber(charger.powerKw) as number,
    ratePerKwh: toNumber(charger.ratePerKwh) as number,
    status: charger.status,
    qrToken: charger.qrToken,
  };
}

async function lockOwnedCharger(tx: Tx, chargerId: string, owner: AuthUser): Promise<OwnedCharger> {
  await tx.$queryRaw<{ id: string }[]>`SELECT id FROM chargers WHERE id = ${chargerId} FOR UPDATE`;
  const charger = await tx.charger.findUnique({
    where: { id: chargerId },
    include: { station: { select: { ownerId: true } } },
  });
  if (!charger) throw new AppError('NOT_FOUND', 404);
  assertOwner(charger.station.ownerId, owner);
  return charger;
}

function toStationDetail(station: StationRelations) {
  const rates = station.chargers.map((charger) => toNumber(charger.ratePerKwh) as number);
  const powers = station.chargers.map((charger) => toNumber(charger.powerKw) as number);
  const avgRating = station.reviews.length
    ? Math.round(
        (station.reviews.reduce((total, review) => total + review.rating, 0) /
          station.reviews.length) *
          10,
      ) / 10
    : null;

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
    avgRating,
    reviewCount: station.reviews.length,
    chargerCount: station.chargers.length,
    availableCount: station.chargers.filter((charger) => charger.status === 'available').length,
    connectors: [...new Set(station.chargers.map((charger) => charger.connector))],
    minRate: rates.length ? Math.min(...rates) : null,
    maxPowerKw: powers.length ? Math.max(...powers) : null,
    chargers: station.chargers.map((charger) => ({
      ...charger,
      powerKw: toNumber(charger.powerKw),
      ratePerKwh: toNumber(charger.ratePerKwh),
    })),
  };
}

async function getOwnedStation(stationId: string, user: AuthUser): Promise<Station> {
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) throw new AppError('NOT_FOUND', 404);
  assertOwner(station.ownerId, user);
  return station;
}

export async function listMyStations(ownerId: string) {
  const stations = await prisma.station.findMany({
    where: { ownerId },
    include: {
      chargers: true,
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return stations.map(toStationDetail);
}

export async function getMyStationDetail(stationId: string, owner: AuthUser) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: { chargers: true, reviews: { select: { rating: true } } },
  });
  if (!station) throw new AppError('NOT_FOUND', 404);
  assertOwner(station.ownerId, owner);
  return toStationDetail(station);
}

export async function createStation(owner: AuthUser, input: StationInput) {
  const station = await prisma.station.create({
    data: {
      ownerId: owner.id,
      name: input.name,
      description: input.description ?? null,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      openingHours: input.openingHours,
      amenities: input.amenities,
      status: 'pending',
    },
  });

  const notices = await Promise.allSettled([
    notify({
      userId: owner.id,
      title: 'Station submitted for review',
      body: `${station.name} was submitted and is awaiting admin approval`,
      type: 'station_submitted',
      refId: station.id,
      email: true,
    }),
    notifyAdmins({
      title: 'New station to review',
      body: `${owner.fullName} submitted "${station.name}" for approval`,
      type: 'station_pending',
      refId: station.id,
      email: true,
    }),
  ]);
  notices.forEach((notice) => {
    if (notice.status === 'rejected') {
      console.error('Could not send station submission notification', { stationId: station.id, error: notice.reason });
    }
  });

  return station;
}

export async function updateStation(
  stationId: string,
  owner: AuthUser,
  input: UpdateStationInput,
) {
  return withTx(async (tx) => {
    await tx.$queryRaw<{ id: string }[]>`SELECT id FROM stations WHERE id = ${stationId} FOR UPDATE`;
    const station = await tx.station.findUnique({ where: { id: stationId } });
    if (!station) throw new AppError('NOT_FOUND', 404);
    assertOwner(station.ownerId, owner);
    return tx.station.update({
      where: { id: stationId },
      data: {
        ...input,
        ...(station.status === 'rejected' ? { status: 'pending', rejectReason: null } : {}),
      },
    });
  });
}

export async function assertStationCanReceivePhoto(stationId: string, owner: AuthUser) {
  const station = await getOwnedStation(stationId, owner);
  if (station.photos.length >= 3) {
    throw new AppError('VALIDATION_ERROR', 400, 'Maximum 3 photos');
  }
}

export async function uploadStationPhoto(
  stationId: string,
  owner: AuthUser,
  file: Express.Multer.File | undefined,
) {
  if (!file) throw new AppError('VALIDATION_ERROR', 400, 'Image is required');

  await assertStationCanReceivePhoto(stationId, owner);
  const asset = await uploadCloudinaryAsset(file, 'stations');

  try {
    return await withTx(async (tx) => {
      // Lock the station row so concurrent uploads cannot push the photo count above three.
      await tx.$queryRaw<{ id: string }[]>`SELECT id FROM stations WHERE id = ${stationId} FOR UPDATE`;
      const station = await tx.station.findUnique({ where: { id: stationId } });
      if (!station) throw new AppError('NOT_FOUND', 404);
      assertOwner(station.ownerId, owner);
      if (station.photos.length >= 3) {
        throw new AppError('VALIDATION_ERROR', 400, 'Maximum 3 photos');
      }

      await tx.station.update({
        where: { id: stationId },
        data: { photos: { push: asset.url } },
      });

      return { url: asset.url };
    });
  } catch (writeError) {
    let assetWasSaved: boolean;
    try {
      const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { photos: true },
      });
      assetWasSaved = station?.photos.includes(asset.url) ?? false;
    } catch (checkError) {
      console.error('Could not verify whether the station photo was saved', {
        stationId,
        error: checkError,
      });
      throw writeError;
    }

    if (!assetWasSaved) {
      try {
        await deleteCloudinaryAsset(asset.publicId);
      } catch (cleanupError) {
        console.error('Could not clean up an uploaded station photo', {
          stationId,
          publicId: asset.publicId,
          error: cleanupError,
        });
      }
    }

    throw writeError;
  }
}

// An update can change only the plug or only the power, so the check uses the saved value for
// whichever field was left out.
function assertPowerFitsConnector(connector: Charger['connector'], powerKw: number) {
  const problem = connectorPowerProblem(connector, powerKw);
  if (problem) throw new AppError('VALIDATION_ERROR', 400, problem);
}

export async function createCharger(stationId: string, owner: AuthUser, input: ChargerInput) {
  const charger = await withTx(async (tx) => {
    await tx.$queryRaw<{ id: string }[]>`SELECT id FROM stations WHERE id = ${stationId} FOR UPDATE`;
    const station = await tx.station.findUnique({ where: { id: stationId } });
    if (!station) throw new AppError('NOT_FOUND', 404);
    assertOwner(station.ownerId, owner);
    assertPowerFitsConnector(input.connector, input.powerKw);

    return tx.charger.create({
      data: {
        stationId,
        ...input,
        qrToken: createChargerQrToken(),
        status: 'available',
      },
    });
  });

  return toCharger(charger);
}

export async function updateCharger(
  chargerId: string,
  owner: AuthUser,
  input: UpdateChargerInput,
) {
  const charger = await withTx(async (tx) => {
    const current = await lockOwnedCharger(tx, chargerId, owner);
    assertPowerFitsConnector(
      input.connector ?? current.connector,
      input.powerKw ?? current.powerKw.toNumber(),
    );
    return tx.charger.update({ where: { id: chargerId }, data: input });
  });

  return toCharger(charger);
}

export async function updateStationCharger(
  stationId: string,
  chargerId: string,
  owner: AuthUser,
  input: UpdateChargerInput,
) {
  const charger = await withTx(async (tx) => {
    const current = await lockOwnedCharger(tx, chargerId, owner);
    if (current.stationId !== stationId) throw new AppError('NOT_FOUND', 404);
    assertPowerFitsConnector(
      input.connector ?? current.connector,
      input.powerKw ?? current.powerKw.toNumber(),
    );
    return tx.charger.update({ where: { id: chargerId }, data: input });
  });
  return toCharger(charger);
}

export async function deleteCharger(chargerId: string, owner: AuthUser) {
  return withTx(async (tx) => {
    const charger = await lockOwnedCharger(tx, chargerId, owner);
    if (charger.status === 'busy') {
      throw new AppError('CHARGER_BUSY', 409, 'This charger is already in use');
    }

    const sessionCount = await tx.session.count({ where: { chargerId } });
    if (sessionCount > 0) {
      throw new AppError(
        'NOT_ALLOWED',
        403,
        'Charger has session history – set it offline instead',
      );
    }

    await tx.charger.delete({ where: { id: chargerId } });
    return { id: chargerId };
  });
}

export async function setChargerStatus(
  chargerId: string,
  owner: AuthUser,
  status: 'available' | 'offline',
) {
  const charger = await withTx(async (tx) => {
    const current = await lockOwnedCharger(tx, chargerId, owner);
    if (current.status === 'busy') {
      throw new AppError('CHARGER_BUSY', 409, 'This charger is already in use');
    }

    return tx.charger.update({ where: { id: chargerId }, data: { status } });
  });

  const result = toCharger(charger);
  const counts = await getStationStatusCounts(result.stationId);
  broadcast('charger:status', {
    chargerId: result.id,
    stationId: result.stationId,
    status: result.status,
    ...counts,
  });
  return result;
}

function toOwnerSession(session: OwnerSession) {
  const customerParts = session.customer.fullName.trim().split(/\s+/);
  const customerName = customerParts.length > 1
    ? `${customerParts[0]} ${customerParts[customerParts.length - 1][0]}.`
    : customerParts[0];
  return {
    id: session.id,
    customerId: session.customerId,
    chargerId: session.chargerId,
    stationId: session.stationId,
    spendingLimit: toNumber(session.spendingLimit) as number,
    kwh: toNumber(session.kwh),
    cost: toNumber(session.cost),
    commission: toNumber(session.commission),
    status: session.status,
    disputeReason: session.disputeReason,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    stationName: session.station.name,
    chargerLabel: session.charger.label,
    connector: session.charger.connector,
    powerKw: toNumber(session.charger.powerKw) as number,
    ratePerKwh: toNumber(session.charger.ratePerKwh) as number,
    customerName,
    hasReview: session.review !== null,
  };
}

export async function listOwnerSessions(ownerId: string) {
  const sessions = await prisma.session.findMany({
    where: { station: { ownerId } },
    include: ownerSessionInclude,
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  return sessions.map(toOwnerSession);
}

export async function disputeSession(sessionId: string, owner: AuthUser, reason: string) {
  const session = await withTx(async (tx) => {
    await tx.$queryRaw<{ id: string }[]>`SELECT id FROM sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
    const current = await tx.session.findUnique({
      where: { id: sessionId },
      include: { station: { select: { ownerId: true } } },
    });
    if (!current) throw new AppError('NOT_FOUND', 404);
    assertOwner(current.station.ownerId, owner);
    const now = new Date();
    if (
      current.status !== 'completed' ||
      !current.endedAt ||
      current.endedAt > now ||
      now.getTime() - current.endedAt.getTime() > 24 * 60 * 60 * 1000
    ) {
      throw new AppError('DISPUTE_WINDOW_CLOSED', 409);
    }

    return tx.session.update({
      where: { id: sessionId },
      data: { status: 'disputed', disputeReason: reason },
      include: ownerSessionInclude,
    });
  });

  const payload = toOwnerSession(session);
  const notices = await Promise.allSettled([
    Promise.resolve().then(() => emitToUser(session.customerId, 'session:updated', payload)),
    notify({
      userId: session.customerId,
      title: 'Charging session disputed',
      body: `The owner has disputed your completed session at ${session.station.name}.`,
      type: 'session_disputed',
      refId: session.id,
      email: true,
    }),
    notifyAdmins({
      title: 'Session disputed',
      body: `${session.station.name} — ${session.charger.label}: ${reason}`,
      type: 'session_disputed',
      refId: session.id,
      email: true,
    }),
  ]);
  notices.forEach((notice) => {
    if (notice.status === 'rejected') {
      console.error('Could not send session dispute notification', { sessionId, error: notice.reason });
    }
  });
  return payload;
}

function colomboDay(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function colomboMidnight(day: string): Date {
  return new Date(`${day}T00:00:00+05:30`);
}

export async function getEarnings(ownerId: string, from?: Date, to?: Date) {
  const today = colomboDay(new Date());
  const fromDay = from ? colomboDay(from) : addDays(today, -6);
  const toDay = to ? colomboDay(to) : today;
  const dayCount =
    (Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86400000 + 1;
  if (dayCount < 1) throw new AppError('VALIDATION_ERROR', 400, 'The date range is invalid');
  if (dayCount > 31) throw new AppError('VALIDATION_ERROR', 400, 'Date range cannot exceed 31 days');

  const start = colomboMidnight(fromDay);
  const endExclusive = colomboMidnight(addDays(toDay, 1));
  const wallet = await prisma.wallet.findUnique({ where: { userId: ownerId }, select: { id: true } });
  const [transactions, sessions] = await Promise.all([
    wallet
      ? prisma.transaction.findMany({
          where: {
            walletId: wallet.id,
            type: 'earning',
            refType: 'session',
            createdAt: { gte: start, lt: endExclusive },
          },
          select: { amount: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.session.findMany({
      where: {
        station: { ownerId },
        status: { in: ['completed', 'disputed'] },
        endedAt: { gte: start, lt: endExclusive },
        commission: { not: null },
      },
      select: { commission: true, endedAt: true },
    }),
  ]);

  const totals = new Map<string, { earnings: number; commission: number; sessions: number }>();
  for (let offset = 0; offset < dayCount; offset += 1) {
    totals.set(addDays(fromDay, offset), { earnings: 0, commission: 0, sessions: 0 });
  }
  for (const transaction of transactions) {
    const day = totals.get(colomboDay(transaction.createdAt));
    if (day) day.earnings += transaction.amount.toNumber();
  }
  for (const session of sessions) {
    if (!session.endedAt) continue;
    const day = totals.get(colomboDay(session.endedAt));
    if (day) {
      day.commission += session.commission?.toNumber() ?? 0;
      day.sessions += 1;
    }
  }

  return [...totals.entries()].map(([day, values]) => ({
    day,
    earnings: Math.round(values.earnings * 100) / 100,
    commission: Math.round(values.commission * 100) / 100,
    sessions: values.sessions,
  }));
}

function toWithdrawal(withdrawal: Withdrawal) {
  return {
    id: withdrawal.id,
    amount: toNumber(withdrawal.amount) as number,
    bankNote: withdrawal.bankNote,
    status: withdrawal.status,
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

export async function listMyWithdrawals(ownerId: string) {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
  return withdrawals.map(toWithdrawal);
}

export async function requestWithdrawal(
  owner: AuthUser,
  input: { amount: number; bankNote: string },
) {
  const withdrawal = await withTx(async (tx) => {
    const created = await tx.withdrawal.create({
      data: { ownerId: owner.id, amount: input.amount, bankNote: input.bankNote, status: 'pending' },
    });
    await credit.hold(tx, {
      userId: owner.id,
      amount: input.amount,
      refType: 'withdrawal',
      refId: created.id,
    });
    return created;
  });

  const effects = await Promise.allSettled([
    credit.emitWalletUpdates([owner.id]),
    notifyAdmins({
      title: 'Withdrawal request',
      body: `${owner.fullName} requested ${input.amount.toFixed(2)} credits`,
      type: 'withdrawal_pending',
      refId: withdrawal.id,
      email: true,
    }),
  ]);
  effects.forEach((effect) => {
    if (effect.status === 'rejected') {
      console.error('Could not complete post-withdrawal notification', { withdrawalId: withdrawal.id, error: effect.reason });
    }
  });
  return toWithdrawal(withdrawal);
}
