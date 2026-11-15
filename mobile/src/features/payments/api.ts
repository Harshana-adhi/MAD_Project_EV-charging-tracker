import { api } from '@/lib/api';
import type { Transaction, TxnType } from '@/types/domain';

export function listTransactions(type?: TxnType): Promise<Transaction[]> {
  return api.get('/transactions', { params: { type } }) as unknown as Promise<Transaction[]>;
}
