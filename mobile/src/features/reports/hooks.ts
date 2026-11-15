import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { IncomePeriod } from './types';
import { api } from './index';

export function useIncome(period: IncomePeriod) {
  return useQuery({
    queryKey: ['reports', 'income', period],
    queryFn: () => api.listIncome(period),
    placeholderData: keepPreviousData,
  });
}

export function useIncomeDetail(key: string) {
  return useQuery({
    queryKey: ['reports', 'income-detail', key],
    queryFn: () => api.getIncomeDetail(key),
    enabled: !!key,
  });
}

export function useOwnerStatement(ownerId: string, month?: string) {
  return useQuery({
    queryKey: ['reports', 'owner', ownerId, month],
    queryFn: () => api.getOwnerStatement(ownerId, month),
    enabled: !!ownerId,
    placeholderData: keepPreviousData,
  });
}

export function useMyStatement(month?: string) {
  return useQuery({
    queryKey: ['reports', 'me', month],
    queryFn: () => api.getMyStatement(month),
    placeholderData: keepPreviousData,
  });
}
