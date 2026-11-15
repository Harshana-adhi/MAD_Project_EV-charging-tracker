import { randomUUID } from 'crypto';
import type { Charger, Session, Station } from '@prisma/client';
import { prisma, toNumber } from '../../core/db';
import { AppError } from '../../core/errors';
import { notify, notifyAdmins } from '../../core/notify.service';
import type {
  AddChargerInput,
  CreateStationInput,
  UpdateChargerInput,
  UpdateStationInput,
} from './owner.schema';

function toStation(station: Station & { chargers?: Charger[] }) {
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
    chargers: station.chargers?.map(toCharger),
  };
}

function toCharger(charger: Charger) {
  return {
    id: charger.id,
    stationId: charger.stationId,
    label: charger.label,
    connector: charger.connector,
    powerKw: toNumber(charger.powerKw),
    ratePerKwh: toNumber(charger.ratePerKwh),
    status: charger.status,
    qrToken: charger.qrToken,
  };
}

async function findOwnStation(ownerId: string, stationId: string) {
  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station || station.ownerId !== ownerId) throw new AppError('NOT_FOUND', 404);
  return station;
}

export async function listOwnStations(ownerId: string) {
  const stations = await prisma.station.findMany({
    where: { ownerId },
    include: { chargers: true },
    orderBy: { createdAt: 'desc' },
  });
  return stations.map(toStation);
}

export async function getOwnStation(ownerId: string, stationId: string) {
  const station = await findOwnStation(ownerId, stationId);
  const withChargers = await prisma.station.findUniqueOrThrow({
    where: { id: station.id },
    include: { chargers: true },
  });
  return toStation(withChargers);
}

export async function createStation(ownerId: string, ownerName: string, input: CreateStationInput) {
  const station = await prisma.station.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      openingHours: input.openingHours,
      amenities: input.amenities,
      photos: input.photos,
      chargers: {
        create: input.chargers.map((charger) => ({
          label: charger.label,
          connector: charger.connector,
          powerKw: charger.powerKw,
          ratePerKwh: charger.ratePerKwh,
          qrToken: randomUUID(),
        })),
      },
    },
    include: { chargers: true },
  });

  await notify({
    userId: ownerId,
    title: 'Station submitted for review',
    body: `${station.name} was submitted and is awaiting admin approval`,
    type: 'station_submitted',
    refId: station.id,
    email: true,
  });
  await notifyAdmins({
    title: 'New station pending review',
    body: `${ownerName} submitted "${station.name}" for approval`,
    type: 'station_pending',
    refId: station.id,
    email: true,
  });

  return toStation(station);
}

export async function updateStation(ownerId: string, stationId: string, input: UpdateStationInput) {
  await findOwnStation(ownerId, stationId);
  const station = await prisma.station.update({
    where: { id: stationId },
    data: input,
    include: { chargers: true },
  });
  return toStation(station);
}

export async function addCharger(ownerId: string, stationId: string, input: AddChargerInput) {
  await findOwnStation(ownerId, stationId);
  const charger = await prisma.charger.create({
    data: {
      stationId,
      label: input.label,
      connector: input.connector,
      powerKw: input.powerKw,
      ratePerKwh: input.ratePerKwh,
      qrToken: randomUUID(),
    },
  });
  return toCharger(charger);
}

async function findOwnCharger(ownerId: string, stationId: string, chargerId: string) {
  await findOwnStation(ownerId, stationId);
  const charger = await prisma.charger.findUnique({ where: { id: chargerId } });
  if (!charger || charger.stationId !== stationId) throw new AppError('NOT_FOUND', 404);
  return charger;
}

export async function updateCharger(
  ownerId: string,
  stationId: string,
  chargerId: string,
  input: UpdateChargerInput,
) {
  await findOwnCharger(ownerId, stationId, chargerId);
  const charger = await prisma.charger.update({ where: { id: chargerId }, data: input });
  return toCharger(charger);
}

function toSessionSummary(session: Session & { station: { name: string }; customer: { fullName: string } }) {
  return {
    id: session.id,
    stationName: session.station.name,
    customerName: session.customer.fullName,
    status: session.status,
    kwh: toNumber(session.kwh),
    cost: toNumber(session.cost),
    commission: toNumber(session.commission),
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

export async function listOwnSessions(ownerId: string) {
  const sessions = await prisma.session.findMany({
    where: { station: { ownerId } },
    include: { station: { select: { name: true } }, customer: { select: { fullName: true } } },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  return sessions.map(toSessionSummary);
}
