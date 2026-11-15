import { api as http } from '@/lib/api';
import type {
  Charger,
  ChargerInput,
  EarningsDay,
  SessionWithNames,
  Station,
  StationDetail,
  StationInput,
  Withdrawal,
} from '@/types/domain';

export type OwnerPhotoUpload = { uri: string; name: string; type: string };

export function listMyStations(): Promise<StationDetail[]> {
  return http.get('/owner/stations') as unknown as Promise<StationDetail[]>;
}

export function createStation(input: StationInput): Promise<Station> {
  return http.post('/owner/stations', input) as unknown as Promise<Station>;
}

export function updateStation(
  id: string,
  input: Partial<StationInput>,
): Promise<Station> {
  return http.patch(`/owner/stations/${id}`, input) as unknown as Promise<Station>;
}

export function uploadStationPhoto(
  id: string,
  photo: OwnerPhotoUpload,
): Promise<{ url: string }> {
  const body = new FormData();
  body.append('image', photo as unknown as Blob);
  return http.post(`/owner/stations/${id}/photos`, body) as unknown as Promise<{ url: string }>;
}

export function createCharger(stationId: string, input: ChargerInput): Promise<Charger> {
  return http.post(`/owner/stations/${stationId}/chargers`, input) as unknown as Promise<Charger>;
}

export function updateCharger(id: string, input: Partial<ChargerInput>): Promise<Charger> {
  return http.patch(`/owner/chargers/${id}`, input) as unknown as Promise<Charger>;
}

export function deleteCharger(id: string): Promise<{ id: string }> {
  return http.delete(`/owner/chargers/${id}`) as unknown as Promise<{ id: string }>;
}

export function setChargerStatus(
  id: string,
  status: 'available' | 'offline',
): Promise<Charger> {
  return http.patch(`/owner/chargers/${id}/status`, { status }) as unknown as Promise<Charger>;
}

export function chargerQrValue(qrToken: string): string {
  return `evcharge://charge/${qrToken}`;
}

export function listOwnerSessions(): Promise<SessionWithNames[]> {
  return http.get('/owner/sessions') as unknown as Promise<SessionWithNames[]>;
}

export function disputeSession(id: string, reason: string): Promise<SessionWithNames> {
  return http.post(`/owner/sessions/${id}/dispute`, { reason }) as unknown as Promise<SessionWithNames>;
}

export function getOwnerEarnings(from: string, to: string): Promise<EarningsDay[]> {
  return http.get('/owner/earnings', { params: { from, to } }) as unknown as Promise<EarningsDay[]>;
}

export function listMyWithdrawals(): Promise<Withdrawal[]> {
  return http.get('/owner/withdrawals') as unknown as Promise<Withdrawal[]>;
}

export function requestWithdrawal(input: { amount: number; bankNote: string }): Promise<Withdrawal> {
  return http.post('/owner/withdrawals', input) as unknown as Promise<Withdrawal>;
}
