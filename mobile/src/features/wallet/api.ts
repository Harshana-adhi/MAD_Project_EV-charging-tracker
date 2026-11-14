import { api as http } from '@/lib/api';
import type { Wallet } from '@/types/domain';

export function getMyWallet(): Promise<Wallet> {
  return http.get('/wallet') as unknown as Promise<Wallet>;
}

export function topUpWithCard(input: { amount: number; cardNumber: string }): Promise<Wallet> {
  return http.post('/wallet/topup', input) as unknown as Promise<Wallet>;
}
