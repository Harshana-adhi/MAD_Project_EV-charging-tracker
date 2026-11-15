import { mockStationDetail } from '@/mocks/fixtures';
import { mockWallet } from '@/mocks/fixtures';
import type {
  Charger,
  ChargerInput,
  EarningsDay,
  SessionWithNames,
  StationDetail,
  StationInput,
  Withdrawal,
} from '@/types/domain';
import type { OwnerPhotoUpload } from './api';

const now = new Date().toISOString();

const approvedStation: StationDetail = {
  ...mockStationDetail,
  ownerId: 'owner-1',
  createdAt: now,
  chargers: [{ ...mockStationDetail.chargers[0] }],
};

const pendingStation: StationDetail = {
  ...approvedStation,
  id: 'owner-station-pending',
  name: 'Kandy Garden Guesthouse',
  address: 'Peradeniya Road, Kandy',
  status: 'pending',
  rejectReason: null,
  chargers: [],
  chargerCount: 0,
  availableCount: 0,
  connectors: [],
  minRate: null,
  maxPowerKw: null,
};

const rejectedStation: StationDetail = {
  ...approvedStation,
  id: 'owner-station-rejected',
  name: 'Hilltop Private Charger',
  status: 'rejected',
  rejectReason: 'Please add a clear photo of the charging unit.',
  chargers: [],
  chargerCount: 0,
  availableCount: 0,
  connectors: [],
  minRate: null,
  maxPowerKw: null,
};

let stations: StationDetail[] = [approvedStation, pendingStation, rejectedStation];

let ownerSessions: SessionWithNames[] = [
  {
    id: 'owner-session-completed',
    customerId: 'customer-1',
    chargerId: approvedStation.chargers[0].id,
    stationId: approvedStation.id,
    spendingLimit: 500,
    kwh: 3,
    cost: 300,
    commission: 15,
    status: 'completed',
    disputeReason: null,
    startedAt: now,
    endedAt: now,
    stationName: approvedStation.name,
    chargerLabel: approvedStation.chargers[0].label,
    connector: approvedStation.chargers[0].connector,
    powerKw: approvedStation.chargers[0].powerKw,
    ratePerKwh: approvedStation.chargers[0].ratePerKwh,
    customerName: 'Amal P.',
    hasReview: false,
  },
];

let ownerWithdrawals: Withdrawal[] = [];

function requireStation(id: string): StationDetail {
  const station = stations.find((item) => item.id === id);
  if (!station) throw new Error('NOT_FOUND');
  return station;
}

function withStationSummary(station: StationDetail, chargers: Charger[]): StationDetail {
  const rates = chargers.map((charger) => charger.ratePerKwh);
  const powers = chargers.map((charger) => charger.powerKw);
  return {
    ...station,
    chargers,
    chargerCount: chargers.length,
    availableCount: chargers.filter((charger) => charger.status === 'available').length,
    connectors: [...new Set(chargers.map((charger) => charger.connector))],
    minRate: rates.length ? Math.min(...rates) : null,
    maxPowerKw: powers.length ? Math.max(...powers) : null,
  };
}

export async function listMyStations(): Promise<StationDetail[]> {
  return stations.map((station) => ({ ...station, chargers: station.chargers.map((item) => ({ ...item })) }));
}

export async function createStation(input: StationInput): Promise<StationDetail> {
  const station: StationDetail = {
    id: `owner-station-${Date.now()}`,
    ownerId: 'owner-1',
    ...input,
    description: input.description ?? null,
    photos: [],
    status: 'pending',
    rejectReason: null,
    createdAt: new Date().toISOString(),
    avgRating: null,
    reviewCount: 0,
    chargerCount: 0,
    availableCount: 0,
    connectors: [],
    minRate: null,
    maxPowerKw: null,
    chargers: [],
  };
  stations = [station, ...stations];
  return station;
}

export async function updateStation(
  id: string,
  input: Partial<StationInput>,
): Promise<StationDetail> {
  const station = requireStation(id);
  const updated = {
    ...station,
    ...input,
    status: station.status === 'rejected' ? 'pending' as const : station.status,
    rejectReason: station.status === 'rejected' ? null : station.rejectReason,
  };
  stations = stations.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function uploadStationPhoto(
  id: string,
  photo: OwnerPhotoUpload,
): Promise<{ url: string }> {
  const station = requireStation(id);
  if (station.photos.length >= 3) throw new Error('VALIDATION_ERROR');
  const url = photo.uri;
  stations = stations.map((item) =>
    item.id === id ? { ...item, photos: [...item.photos, url] } : item,
  );
  return { url };
}

export async function createCharger(stationId: string, input: ChargerInput): Promise<Charger> {
  const station = requireStation(stationId);
  const qrToken = Math.random().toString(36).slice(2).padEnd(12, '0').slice(0, 12);
  const charger: Charger = {
    id: `owner-charger-${Date.now()}`,
    stationId,
    ...input,
    status: 'available',
    qrToken,
  };
  stations = stations.map((item) =>
    item.id === stationId ? withStationSummary(station, [...station.chargers, charger]) : item,
  );
  return charger;
}

export async function updateCharger(id: string, input: Partial<ChargerInput>): Promise<Charger> {
  let updated: Charger | undefined;
  stations = stations.map((station) =>
    withStationSummary(
      station,
      station.chargers.map((charger) => {
        if (charger.id !== id) return charger;
        updated = { ...charger, ...input };
        return updated;
      }),
    ),
  );
  if (!updated) throw new Error('NOT_FOUND');
  return updated;
}

export async function deleteCharger(id: string): Promise<{ id: string }> {
  const station = stations.find((item) => item.chargers.some((charger) => charger.id === id));
  if (!station) throw new Error('NOT_FOUND');
  if (station.chargers.find((charger) => charger.id === id)?.status === 'busy') {
    throw new Error('CHARGER_BUSY');
  }
  if (ownerSessions.some((session) => session.chargerId === id)) {
    throw new Error('Charger has session history – set it offline instead');
  }
  stations = stations.map((item) =>
    item.id === station.id
      ? withStationSummary(item, item.chargers.filter((charger) => charger.id !== id))
      : item,
  );
  return { id };
}

export async function setChargerStatus(
  id: string,
  status: 'available' | 'offline',
): Promise<Charger> {
  const currentStation = stations.find((item) => item.chargers.some((charger) => charger.id === id));
  if (!currentStation) throw new Error('NOT_FOUND');
  if (currentStation.chargers.find((charger) => charger.id === id)?.status === 'busy') {
    throw new Error('CHARGER_BUSY');
  }

  let updated: Charger | undefined;
  stations = stations.map((station) =>
    withStationSummary(
      station,
      station.chargers.map((charger) => {
        if (charger.id !== id) return charger;
        updated = { ...charger, status };
        return updated;
      }),
    ),
  );
  if (!updated) throw new Error('NOT_FOUND');
  return updated;
}

export function chargerQrValue(qrToken: string): string {
  return `evcharge://charge/${qrToken}`;
}

export async function listOwnerSessions(): Promise<SessionWithNames[]> {
  return ownerSessions.map((session) => ({ ...session }));
}

export async function disputeSession(id: string, reason: string): Promise<SessionWithNames> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 10 || trimmedReason.length > 300) throw new Error('VALIDATION_ERROR');
  const session = ownerSessions.find((item) => item.id === id);
  if (!session) throw new Error('NOT_FOUND');
  if (session.status !== 'completed' || !session.endedAt) throw new Error('DISPUTE_WINDOW_CLOSED');
  if (Date.now() - new Date(session.endedAt).getTime() > 24 * 60 * 60 * 1000) {
    throw new Error('DISPUTE_WINDOW_CLOSED');
  }
  const updated = { ...session, status: 'disputed' as const, disputeReason: trimmedReason };
  ownerSessions = ownerSessions.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function getOwnerEarnings(from: string, to: string): Promise<EarningsDay[]> {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const dayCount = (end.getTime() - start.getTime()) / 86400000 + 1;
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 31) throw new Error('VALIDATION_ERROR');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const days: EarningsDay[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = cursor.toISOString().slice(0, 10);
    const sample = day === today;
    days.push({ day, earnings: sample ? 285 : 0, commission: sample ? 15 : 0, sessions: sample ? 1 : 0 });
  }
  return days;
}

export async function listMyWithdrawals(): Promise<Withdrawal[]> {
  return ownerWithdrawals.map((withdrawal) => ({ ...withdrawal }));
}

export async function requestWithdrawal(input: { amount: number; bankNote: string }): Promise<Withdrawal> {
  const bankNote = input.bankNote.trim();
  if (input.amount < 500 || Math.round(input.amount * 100) !== input.amount * 100 || bankNote.length < 5 || bankNote.length > 200) {
    throw new Error('VALIDATION_ERROR');
  }
  if (input.amount > mockWallet.available) throw new Error('INSUFFICIENT_BALANCE');
  const withdrawal: Withdrawal = {
    id: `owner-withdrawal-${Date.now()}`,
    amount: input.amount,
    bankNote,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  ownerWithdrawals = [withdrawal, ...ownerWithdrawals];
  return withdrawal;
}
