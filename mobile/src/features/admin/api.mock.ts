import { mockStationSummary, mockUser, mockWithdrawal } from '@/mocks/fixtures';
import type {
  AdminCounts,
  AdminDispute,
  AdminStation,
  AdminTopup,
  AdminWithdrawal,
  RequestStatus,
  Station,
  StationStatus,
  TopupRequest,
  User,
  Withdrawal,
  WithdrawalStatus,
} from '@/types/domain';
import type { ReviewInput } from './api';

const now = new Date().toISOString();

const baseStation: Station = {
  id: mockStationSummary.id,
  ownerId: mockStationSummary.ownerId,
  name: mockStationSummary.name,
  description: mockStationSummary.description,
  address: mockStationSummary.address,
  lat: mockStationSummary.lat,
  lng: mockStationSummary.lng,
  openingHours: mockStationSummary.openingHours,
  amenities: mockStationSummary.amenities,
  photos: mockStationSummary.photos,
  status: 'approved',
  rejectReason: null,
  createdAt: now,
};

let stations: AdminStation[] = [
  { ...baseStation, ownerName: 'Station Owner One', chargerCount: 1 },
  {
    ...baseStation,
    id: 'station-2',
    name: 'New Homeowner Charger',
    address: 'Katugastota Rd, Kandy',
    lat: 7.3156,
    lng: 80.6336,
    status: 'pending',
    ownerName: 'Station Owner One',
    chargerCount: 1,
  },
  {
    ...baseStation,
    id: 'station-3',
    name: 'Lake View Restaurant',
    address: 'Sangaraja Mawatha, Kandy',
    lat: 7.2912,
    lng: 80.6421,
    status: 'pending',
    ownerName: 'Station Owner Two',
    chargerCount: 2,
  },
  {
    ...baseStation,
    id: 'station-4',
    name: 'Roadside Stall Charger',
    address: 'A9 Road, Matale',
    lat: 7.4675,
    lng: 80.6234,
    status: 'rejected',
    rejectReason: 'Photos do not show a charger',
    ownerName: 'Station Owner Two',
    chargerCount: 0,
  },
];

let topups: AdminTopup[] = [
  {
    id: 'topup-2',
    amount: 1500,
    method: 'slip',
    slipUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    status: 'pending',
    reason: null,
    createdAt: now,
    userName: 'Customer One',
  },
  {
    id: 'topup-3',
    amount: 3000,
    method: 'slip',
    slipUrl: null,
    status: 'pending',
    reason: null,
    createdAt: now,
    userName: 'Customer Two',
  },
];

let withdrawals: AdminWithdrawal[] = [
  { ...mockWithdrawal, ownerName: 'Station Owner One' },
  {
    id: 'withdrawal-2',
    amount: 1000,
    bankNote: 'Sampath Bank - 009876543',
    status: 'pending',
    createdAt: now,
    ownerName: 'Station Owner Two',
  },
];

let users: User[] = [
  { ...mockUser, id: 'admin-1', email: 'admin@evct.lk', fullName: 'Admin User', role: 'admin' },
  { ...mockUser, id: 'owner-1', email: 'owner@evct.lk', fullName: 'Station Owner One', role: 'owner' },
  { ...mockUser, id: 'owner-2', email: 'owner2@evct.lk', fullName: 'Station Owner Two', role: 'owner' },
  { ...mockUser, fullName: 'Customer One' },
  { ...mockUser, id: 'user-2', email: 'customer2@evct.lk', fullName: 'Customer Two', isBlocked: true },
];

export async function getAdminCounts(): Promise<AdminCounts> {
  return {
    pendingStations: stations.filter((station) => station.status === 'pending').length,
    pendingTopups: topups.filter((topup) => topup.status === 'pending').length,
    pendingWithdrawals: withdrawals.filter((withdrawal) => withdrawal.status === 'pending').length,
    pendingDisputes: 0,
    users: users.length,
  };
}

export async function listStationsByStatus(status: StationStatus): Promise<AdminStation[]> {
  return stations.filter((station) => station.status === status);
}

export async function reviewStation(id: string, input: ReviewInput): Promise<Station> {
  const station = stations.find((item) => item.id === id);
  if (!station) throw new Error('NOT_FOUND');
  if (station.status !== 'pending') throw new Error('ALREADY_PROCESSED');
  const updated: AdminStation = {
    ...station,
    status: input.approve ? 'approved' : 'rejected',
    rejectReason: input.approve ? null : (input.reason ?? null),
  };
  stations = stations.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function setStationHidden(id: string, hidden: boolean): Promise<Station> {
  const station = stations.find((item) => item.id === id);
  if (!station) throw new Error('NOT_FOUND');
  if (hidden ? station.status !== 'approved' : station.status !== 'hidden') throw new Error('ALREADY_PROCESSED');
  const updated: AdminStation = { ...station, status: hidden ? 'hidden' : 'approved' };
  stations = stations.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function listTopups(status: RequestStatus): Promise<AdminTopup[]> {
  return topups.filter((topup) => topup.status === status);
}

export async function reviewTopup(id: string, input: ReviewInput): Promise<TopupRequest> {
  const topup = topups.find((item) => item.id === id);
  if (!topup) throw new Error('NOT_FOUND');
  if (topup.status !== 'pending') throw new Error('ALREADY_PROCESSED');
  const updated: AdminTopup = {
    ...topup,
    status: input.approve ? 'approved' : 'rejected',
    reason: input.approve ? null : (input.reason ?? null),
  };
  topups = topups.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function listWithdrawals(status: WithdrawalStatus): Promise<AdminWithdrawal[]> {
  return withdrawals.filter((withdrawal) => withdrawal.status === status);
}

export async function processWithdrawal(id: string, approve: boolean): Promise<Withdrawal> {
  const withdrawal = withdrawals.find((item) => item.id === id);
  if (!withdrawal) throw new Error('NOT_FOUND');
  if (withdrawal.status !== 'pending') throw new Error('ALREADY_PROCESSED');
  const updated: AdminWithdrawal = { ...withdrawal, status: approve ? 'paid' : 'rejected' };
  withdrawals = withdrawals.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function listDisputes(): Promise<AdminDispute[]> {
  return [];
}

export async function resolveDispute(id: string): Promise<{ id: string }> {
  return { id };
}

export async function listUsers(search?: string): Promise<User[]> {
  const term = search?.trim().toLowerCase();
  if (!term) return users;
  return users.filter(
    (user) => user.fullName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
  );
}

export async function setUserBlocked(id: string, blocked: boolean): Promise<User> {
  const user = users.find((item) => item.id === id);
  if (!user) throw new Error('NOT_FOUND');
  if (user.role === 'admin') throw new Error('NOT_ALLOWED');
  const updated = { ...user, isBlocked: blocked };
  users = users.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<{ ok: true }> {
  if (!users.some((user) => user.id === id)) throw new Error('NOT_FOUND');
  if (newPassword.length < 8) throw new Error('VALIDATION_ERROR');
  return { ok: true };
}
