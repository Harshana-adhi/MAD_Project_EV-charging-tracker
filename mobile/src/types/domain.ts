export type Role = 'customer' | 'owner' | 'admin';
export type ConnectorType = 'TYPE1' | 'TYPE2' | 'CCS2' | 'CHADEMO' | 'GBT';
export type StationStatus = 'pending' | 'approved' | 'rejected';
export type ChargerStatus = 'available' | 'busy' | 'offline';
export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'disputed';
export type TxnType =
  | 'topup'
  | 'hold'
  | 'release'
  | 'charge'
  | 'earning'
  | 'commission'
  | 'withdrawal';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  makeModel: string;
  connector: ConnectorType;
  batteryKwh: number | null;
}

export type VehicleInput = Omit<Vehicle, 'id'>;

export interface Station {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  openingHours: string;
  amenities: string[];
  photos: string[];
  status: StationStatus;
  rejectReason: string | null;
  createdAt: string;
}

export type StationInput = Pick<
  Station,
  'name' | 'description' | 'address' | 'lat' | 'lng' | 'openingHours' | 'amenities'
>;

export interface Charger {
  id: string;
  stationId: string;
  label: string;
  connector: ConnectorType;
  powerKw: number;
  ratePerKwh: number;
  status: ChargerStatus;
  qrToken: string;
}

export type ChargerInput = Pick<Charger, 'label' | 'connector' | 'powerKw' | 'ratePerKwh'>;

export interface StationSummary extends Station {
  avgRating: number | null;
  reviewCount: number;
  chargerCount: number;
  availableCount: number;
  connectors: ConnectorType[];
  minRate: number | null;
  maxPowerKw: number | null;
  distanceKm?: number;
}

export interface StationDetail extends StationSummary {
  chargers: Charger[];
  isFavourite?: boolean;
}

export interface StationFilters {
  connector?: ConnectorType;
  minPowerKw?: number;
  maxRate?: number;
  availableOnly?: boolean;
  search?: string;
  lat?: number;
  lng?: number;
}

export interface ChargerLookup {
  charger: Charger;
  station: Pick<Station, 'id' | 'name' | 'address'>;
  available: number;
}

export interface Wallet {
  balance: number;
  held: number;
  available: number;
}

export interface Transaction {
  id: string;
  type: TxnType;
  amount: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  createdAt: string;
}

export interface TopupRequest {
  id: string;
  amount: number;
  method: 'card' | 'slip';
  slipUrl: string | null;
  status: RequestStatus;
  reason: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  customerId: string;
  chargerId: string;
  stationId: string;
  spendingLimit: number;
  kwh: number | null;
  cost: number | null;
  commission: number | null;
  status: SessionStatus;
  disputeReason: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface SessionWithNames extends Session {
  stationName: string;
  chargerLabel: string;
  connector: ConnectorType;
  powerKw: number;
  ratePerKwh: number;
  customerName: string;
  hasReview: boolean;
}

export interface Withdrawal {
  id: string;
  amount: number;
  bankNote: string;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  stationId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  refId: string | null;
  read: boolean;
  createdAt: string;
}

export interface EarningsDay {
  day: string;
  earnings: number;
  commission: number;
  sessions: number;
}

export interface AdminCounts {
  pendingStations: number;
  pendingTopups: number;
  pendingWithdrawals: number;
  users: number;
}

export interface AdminStation extends Station {
  ownerName: string;
  chargerCount: number;
}

export interface AdminTopup extends TopupRequest {
  userName: string;
}

export interface AdminWithdrawal extends Withdrawal {
  ownerName: string;
}
