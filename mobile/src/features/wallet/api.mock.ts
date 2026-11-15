import { mockWallet } from '@/mocks/fixtures';
import type { Wallet } from '@/types/domain';

export async function getMyWallet(): Promise<Wallet> {
  return mockWallet;
}

export async function topUpWithCard(input: { amount: number; cardNumber: string }): Promise<Wallet> {
  const card = input.cardNumber.replace(/\s/g, '');
  if (card === '4000000000000002') throw new Error('CARD_DECLINED');
  if (card !== '4242424242424242') throw new Error('VALIDATION_ERROR');
  return {
    ...mockWallet,
    balance: mockWallet.balance + input.amount,
    available: mockWallet.available + input.amount,
  };
}
