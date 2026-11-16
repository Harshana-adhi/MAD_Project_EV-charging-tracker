import { api as http } from '@/lib/api';
import type {
  AdminCounts,
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

export type ReviewInput = { approve: boolean; reason?: string };

export function getAdminCounts(): Promise<AdminCounts> {
  return http.get('/admin/counts') as unknown as Promise<AdminCounts>;
}

export function listStationsByStatus(status: StationStatus): Promise<AdminStation[]> {
  return http.get('/admin/stations', { params: { status } }) as unknown as Promise<AdminStation[]>;
}

export function reviewStation(id: string, input: ReviewInput): Promise<Station> {
  return http.post(`/admin/stations/${id}/review`, input) as unknown as Promise<Station>;
}

export function setStationHidden(id: string, hidden: boolean): Promise<Station> {
  return http.patch(`/admin/stations/${id}/hidden`, { hidden }) as unknown as Promise<Station>;
}

export function listTopups(status: RequestStatus): Promise<AdminTopup[]> {
  return http.get('/admin/topups', { params: { status } }) as unknown as Promise<AdminTopup[]>;
}

export function reviewTopup(id: string, input: ReviewInput): Promise<TopupRequest> {
  return http.post(`/admin/topups/${id}/review`, input) as unknown as Promise<TopupRequest>;
}

export function listWithdrawals(status: WithdrawalStatus): Promise<AdminWithdrawal[]> {
  return http.get('/admin/withdrawals', {
    params: { status },
  }) as unknown as Promise<AdminWithdrawal[]>;
}

export function processWithdrawal(id: string, approve: boolean): Promise<Withdrawal> {
  return http.post(`/admin/withdrawals/${id}/process`, {
    approve,
  }) as unknown as Promise<Withdrawal>;
}

export function listUsers(search?: string): Promise<User[]> {
  return http.get('/admin/users', {
    params: search ? { search } : undefined,
  }) as unknown as Promise<User[]>;
}

export function setUserBlocked(id: string, blocked: boolean): Promise<User> {
  return http.patch(`/admin/users/${id}/block`, { blocked }) as unknown as Promise<User>;
}

export function resetUserPassword(id: string, newPassword: string): Promise<{ ok: true }> {
  return http.patch(`/admin/users/${id}/password`, {
    newPassword,
  }) as unknown as Promise<{ ok: true }>;
}
