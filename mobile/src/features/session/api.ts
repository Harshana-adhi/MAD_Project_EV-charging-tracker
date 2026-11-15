import { api as http } from '@/lib/api';
import type { ChargerLookup, Session, SessionWithNames } from '@/types/domain';

export function getChargerByQr(qrToken: string): Promise<ChargerLookup> {
  return http.get(`/sessions/charger/${encodeURIComponent(qrToken)}`) as unknown as Promise<ChargerLookup>;
}

export function startSession(input: { qrToken: string; spendingLimit: number }): Promise<Session> {
  return http.post('/sessions/start', input) as unknown as Promise<Session>;
}

export function endSession(id: string, kwh: number): Promise<Session> {
  return http.post(`/sessions/${encodeURIComponent(id)}/end`, { kwh }) as unknown as Promise<Session>;
}

export function cancelSession(id: string): Promise<Session> {
  return http.post(`/sessions/${encodeURIComponent(id)}/cancel`) as unknown as Promise<Session>;
}

export function getActiveSession(): Promise<SessionWithNames | null> {
  return http.get('/sessions/active') as unknown as Promise<SessionWithNames | null>;
}

export function listMySessions(): Promise<SessionWithNames[]> {
  return http.get('/sessions') as unknown as Promise<SessionWithNames[]>;
}

export function getSession(id: string): Promise<SessionWithNames> {
  return http.get(`/sessions/${encodeURIComponent(id)}`) as unknown as Promise<SessionWithNames>;
}
