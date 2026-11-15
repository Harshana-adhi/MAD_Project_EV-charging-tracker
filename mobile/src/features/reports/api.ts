import { api as http } from '@/lib/api';
import type { IncomeDetail, IncomePeriod, IncomeRow, OwnerStatement } from './types';

export function listIncome(period: IncomePeriod): Promise<IncomeRow[]> {
  return http.get('/reports/income', { params: { period } }) as unknown as Promise<IncomeRow[]>;
}

export function getIncomeDetail(key: string): Promise<IncomeDetail> {
  return http.get(`/reports/income/${key}`) as unknown as Promise<IncomeDetail>;
}

export function getOwnerStatement(ownerId: string, month?: string): Promise<OwnerStatement> {
  return http.get(`/reports/owners/${ownerId}`, {
    params: month ? { month } : undefined,
  }) as unknown as Promise<OwnerStatement>;
}

export function getMyStatement(month?: string): Promise<OwnerStatement> {
  return http.get('/reports/me', {
    params: month ? { month } : undefined,
  }) as unknown as Promise<OwnerStatement>;
}
