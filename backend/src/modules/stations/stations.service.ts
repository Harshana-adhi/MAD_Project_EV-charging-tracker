import type { Charger, Station } from '@prisma/client';
import { prisma, toNumber } from '../../core/db';
import { AppError } from '../../core/errors';

type StationWithRelations = Station & {
  chargers: Charger[];
  reviews: { rating: number }[];
};

type LatLng = { lat: number; lng: number };

function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function summariseStation(station: StationWithRelations, near?: LatLng) {
  const availableCount = station.chargers.filter((c) => c.status === 'available').length;
  const connectors = [...new Set(station.chargers.map((c) => c.connector))];
  const rates = station.chargers.map((c) => toNumber(c.ratePerKwh) as number);
  const powers = station.chargers.map((c) => toNumber(c.powerKw) as number);
  const avgRating =
    station.reviews.length === 0
      ? null
      : Math.round((station.reviews.reduce((sum, r) => sum + r.rating, 0) / station.reviews.length) * 10) / 10;

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
    chargerCount: station.chargers.length,
    availableCount,
    connectors,
    minRate: rates.length === 0 ? null : Math.min(...rates),
    maxPowerKw: powers.length === 0 ? null : Math.max(...powers),
    avgRating,
    reviewCount: station.reviews.length,
    distanceKm: near ? distanceKm(near, { lat: station.lat, lng: station.lng }) : undefined,
  };
}

export function summariseStations(stations: StationWithRelations[], near?: LatLng) {
  return stations.map((station) => summariseStation(station, near));
}

export type StationFilters = {
  connector?: 'TYPE1' | 'TYPE2' | 'CCS2' | 'CHADEMO' | 'GBT';
  minPowerKw?: number;
  maxRate?: number;
  availableOnly?: boolean;
  search?: string;
  lat?: number;
  lng?: number;
};

export async function listStations(filters: StationFilters) {
  const stations = await prisma.station.findMany({
    where: {
      status: 'approved',
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
    },
    include: { chargers: true, reviews: { select: { rating: true } } },
  });

  const near = filters.lat !== undefined && filters.lng !== undefined ? { lat: filters.lat, lng: filters.lng } : undefined;
  let summaries = summariseStations(stations, near);

  if (filters.connector) {
    const connector = filters.connector;
    summaries = summaries.filter((s) => s.connectors.includes(connector));
  }
  if (filters.minPowerKw !== undefined) {
    const minPowerKw = filters.minPowerKw;
    summaries = summaries.filter((s) => s.maxPowerKw !== null && s.maxPowerKw >= minPowerKw);
  }
  if (filters.maxRate !== undefined) {
    const maxRate = filters.maxRate;
    summaries = summaries.filter((s) => s.minRate !== null && s.minRate <= maxRate);
  }
  if (filters.availableOnly) {
    summaries = summaries.filter((s) => s.availableCount > 0);
  }

  summaries.sort((a, b) =>
    near ? (a.distanceKm as number) - (b.distanceKm as number) : a.name.localeCompare(b.name),
  );

  return summaries;
}

export async function getStationById(id: string, viewerId?: string) {
  const station = await prisma.station.findFirst({
    where: { id, status: 'approved' },
    include: { chargers: true, reviews: { select: { rating: true } } },
  });
  if (!station) throw new AppError('NOT_FOUND', 404);

  const summary = summariseStation(station);
  const chargers = station.chargers.map((c) => ({
    id: c.id,
    stationId: c.stationId,
    label: c.label,
    connector: c.connector,
    powerKw: toNumber(c.powerKw),
    ratePerKwh: toNumber(c.ratePerKwh),
    status: c.status,
    qrToken: c.qrToken,
  }));

  let isFavourite: boolean | undefined;
  if (viewerId) {
    const favourite = await prisma.favourite.findUnique({
      where: { userId_stationId: { userId: viewerId, stationId: id } },
    });
    isFavourite = !!favourite;
  }

  return { ...summary, chargers, isFavourite };
}
