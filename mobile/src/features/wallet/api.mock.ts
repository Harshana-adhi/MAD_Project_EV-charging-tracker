import { mockWallet } from '@/mocks/fixtures';
import type { Wallet } from '@/types/domain';

export async function getMyWallet(): Promise<Wallet> {
  return mockWallet;
}

export async function topUpWithCard(input: { amount: number; cardNumber: string }): Promise<Wallet> {
  return { ...mockWallet, balance: mockWallet.balance + input.amount, available: mockWallet.available + input.amount };
}
