import { mockTransaction } from '@/mocks/fixtures';
import type { TopupRequest, Transaction, TxnType } from '@/types/domain';

const topups: TopupRequest[] = [];
let nextRequestId = 1;

export async function listTransactions(type?: TxnType): Promise<Transaction[]> {
  return !type || type === mockTransaction.type ? [mockTransaction] : [];
}

export async function listMyTopups(): Promise<TopupRequest[]> {
  return [...topups];
}

export async function requestSlipTopUp(amount: number, imageUri: string): Promise<TopupRequest> {
  if (!Number.isInteger(amount) || amount < 100 || amount > 50000 || !imageUri) {
    throw new Error('VALIDATION_ERROR');
  }
  const request: TopupRequest = {
    id: `mock-slip-${nextRequestId++}`,
    amount,
    method: 'slip',
    slipUrl: imageUri,
    status: 'pending',
    reason: null,
    createdAt: new Date().toISOString(),
  };
  topups.unshift(request);
  return request;
}
