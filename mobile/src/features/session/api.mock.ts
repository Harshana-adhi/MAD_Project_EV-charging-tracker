import { mockCharger, mockStationDetail, mockUser, mockWallet } from '@/mocks/fixtures';
import type { ChargerLookup, Session, SessionWithNames } from '@/types/domain';

const sessions: SessionWithNames[] = [];
let chargerBusy = false;

export async function getChargerByQr(qrToken: string): Promise<ChargerLookup> {
  if (qrToken !== mockCharger.qrToken) throw new Error('CHARGER_NOT_FOUND');
  return {
    charger: { ...mockCharger, status: chargerBusy ? 'busy' : 'available' },
    station: {
      id: mockStationDetail.id,
      name: mockStationDetail.name,
      address: mockStationDetail.address,
    },
    available: mockWallet.available,
  };
}

export async function startSession(input: { qrToken: string; spendingLimit: number }): Promise<Session> {
  if (input.qrToken !== mockCharger.qrToken) throw new Error('CHARGER_NOT_FOUND');
  if (chargerBusy) throw new Error('CHARGER_BUSY');
  if (sessions.some((session) => session.status === 'active')) throw new Error('ACTIVE_SESSION_EXISTS');
  if (mockWallet.available < input.spendingLimit) throw new Error('INSUFFICIENT_BALANCE');
  const session: SessionWithNames = {
    id: `mock-session-${Date.now()}`,
    customerId: mockUser.id,
    chargerId: mockCharger.id,
    stationId: mockStationDetail.id,
    spendingLimit: input.spendingLimit,
    kwh: null,
    cost: null,
    commission: null,
    status: 'active',
    disputeReason: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    stationName: mockStationDetail.name,
    chargerLabel: mockCharger.label,
    connector: mockCharger.connector,
    powerKw: mockCharger.powerKw,
    ratePerKwh: mockCharger.ratePerKwh,
    customerName: mockUser.fullName,
    hasReview: false,
  };
  sessions.unshift(session);
  mockWallet.held += input.spendingLimit;
  mockWallet.available -= input.spendingLimit;
  chargerBusy = true;
  return session;
}

export async function endSession(id: string, kwh: number): Promise<Session> {
  const session = sessions.find((item) => item.id === id);
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (session.status !== 'active') throw new Error('SESSION_NOT_ACTIVE');
  const cost = Math.round(Math.min(kwh * session.ratePerKwh, session.spendingLimit) * 100) / 100;
  session.status = 'completed';
  session.kwh = kwh;
  session.cost = cost;
  session.commission = Math.round(cost * 0.05 * 100) / 100;
  session.endedAt = new Date().toISOString();
  mockWallet.balance -= cost;
  mockWallet.held -= session.spendingLimit;
  mockWallet.available = mockWallet.balance - mockWallet.held;
  chargerBusy = false;
  return session;
}

export async function cancelSession(id: string): Promise<Session> {
  const session = sessions.find((item) => item.id === id);
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (session.status !== 'active') throw new Error('SESSION_NOT_ACTIVE');
  session.status = 'cancelled';
  session.endedAt = new Date().toISOString();
  mockWallet.held -= session.spendingLimit;
  mockWallet.available = mockWallet.balance - mockWallet.held;
  chargerBusy = false;
  return session;
}

export async function getActiveSession(): Promise<SessionWithNames | null> {
  return sessions.find((session) => session.status === 'active') ?? null;
}

export async function listMySessions(): Promise<SessionWithNames[]> {
  return [...sessions];
}

export async function getSession(id: string): Promise<SessionWithNames> {
  const session = sessions.find((item) => item.id === id);
  if (!session) throw new Error('SESSION_NOT_FOUND');
  return { ...session };
}
