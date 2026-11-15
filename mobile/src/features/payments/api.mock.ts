import { mockTransaction } from '@/mocks/fixtures';
import type { Transaction, TxnType } from '@/types/domain';

export async function listTransactions(type?: TxnType): Promise<Transaction[]> {
  return !type || type === mockTransaction.type ? [mockTransaction] : [];
}
