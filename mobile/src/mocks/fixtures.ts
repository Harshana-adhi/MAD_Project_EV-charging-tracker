import type {
  AppNotification,
  Charger,
  EarningsDay,
  Review,
  Session,
  StationDetail,
  StationSummary,
  Transaction,
  User,
  Vehicle,
  Wallet,
  Withdrawal,
} from '@/types/domain';

export const mockUser: User = {
  id: 'user-1',
  email: 'customer@evct.lk',
  fullName: 'Nimal Perera',
  phone: '0771234567',
  role: 'customer',
  isBlocked: false,
  createdAt: new Date().toISOString(),
};

export const mockWallet: Wallet = { balance: 5000, held: 1000, available: 4000 };

export const mockVehicle: Vehicle = {
  id: 'vehicle-1',
  makeModel: 'Nissan Leaf',
  connector: 'TYPE2',
  batteryKwh: 40,
};

export const mockCharger: Charger = {
  id: 'charger-1',
  stationId: 'station-1',
  label: 'A1',
  connector: 'TYPE2',
  powerKw: 22,
  ratePerKwh: 85,
  status: 'available',
  qrToken: 'mockqrtoken1',
};

export const mockStationSummary: StationSummary = {
  id: 'station-1',
  ownerId: 'owner-1',
  name: 'Kandy City Hotel Charging Point',
  description: 'Covered parking with a 22kW charger.',
  address: '25 Dalada Veediya, Kandy',
  lat: 7.2936,
  lng: 80.6413,
  openingHours: '06:00-22:00',
  amenities: ['Parking', 'Restroom', 'Cafe'],
  photos: [],
  status: 'approved',
  rejectReason: null,
  createdAt: new Date().toISOString(),
  avgRating: 4.5,
  reviewCount: 12,
  chargerCount: 1,
  availableCount: 1,
  onlineCount: 1,
  connectors: ['TYPE2'],
  minRate: 85,
  maxPowerKw: 22,
};

export const mockStationDetail: StationDetail = {
  ...mockStationSummary,
  chargers: [mockCharger],
  isFavourite: false,
};

export const mockSession: Session = {
  id: 'session-1',
  customerId: 'user-1',
  chargerId: 'charger-1',
  stationId: 'station-1',
  spendingLimit: 1000,
  kwh: null,
  cost: null,
  commission: null,
  status: 'active',
  disputeReason: null,
  startedAt: new Date().toISOString(),
  endedAt: null,
};

export const mockTransaction: Transaction = {
  id: 'txn-1',
  type: 'topup',
  amount: 5000,
  refType: 'topup',
  refId: 'topup-1',
  note: 'Card top-up',
  createdAt: new Date().toISOString(),
};

export const mockWithdrawal: Withdrawal = {
  id: 'withdrawal-1',
  amount: 2000,
  bankNote: 'Commercial Bank - 001234567',
  status: 'pending',
  createdAt: new Date().toISOString(),
};

export const mockReview: Review = {
  id: 'review-1',
  stationId: 'station-1',
  customerName: 'Nimal Perera',
  rating: 5,
  comment: 'Fast and reliable charger.',
  createdAt: new Date().toISOString(),
};

export const mockNotification: AppNotification = {
  id: 'notification-1',
  title: 'Session completed',
  body: 'Your charging session has ended.',
  type: 'session_completed',
  refId: 'session-1',
  read: false,
  createdAt: new Date().toISOString(),
};

export const mockEarningsDay: EarningsDay = {
  day: new Date().toISOString().slice(0, 10),
  earnings: 1500,
  commission: 75,
  sessions: 3,
};
