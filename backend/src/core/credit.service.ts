import { Prisma } from '@prisma/client';
import type { Tx } from './db';
import { prisma } from './db';
import { AppError } from './errors';
import { emitToUser } from './socket';

type TxnType = 'topup' | 'hold' | 'release' | 'charge' | 'earning' | 'commission' | 'withdrawal';

const COMMISSION_RATE = 0.05;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function lockWallet(tx: Tx, userId: string | null) {
  const rows =
    userId === null
      ? await tx.$queryRaw<{ id: string; balance: Prisma.Decimal; held: Prisma.Decimal }[]>`
          SELECT id, balance, held FROM wallets WHERE user_id IS NULL FOR UPDATE`
      : await tx.$queryRaw<{ id: string; balance: Prisma.Decimal; held: Prisma.Decimal }[]>`
          SELECT id, balance, held FROM wallets WHERE user_id = ${userId} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new AppError('NOT_FOUND', 404, 'Wallet not found');
  return { id: row.id, balance: Number(row.balance), held: Number(row.held) };
}

async function writeTxn(
  tx: Tx,
  walletId: string,
  type: TxnType,
  amount: number,
  refType?: string,
  refId?: string,
  note?: string,
) {
  await tx.transaction.create({ data: { walletId, type, amount, refType, refId, note } });
}

async function createWallet(tx: Tx, userId: string) {
  return tx.wallet.create({ data: { userId, balance: 0, held: 0 } });
}

async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new AppError('NOT_FOUND', 404, 'Wallet not found');
  const balance = wallet.balance.toNumber();
  const held = wallet.held.toNumber();
  return { balance, held, available: round2(balance - held) };
}

async function creditFn(
  tx: Tx,
  input: {
    userId: string;
    amount: number;
    type: 'topup' | 'earning';
    refType?: string;
    refId?: string;
    note?: string;
  },
) {
  if (input.amount <= 0) throw new AppError('INVALID_AMOUNT', 400);
  const wallet = await lockWallet(tx, input.userId);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: round2(wallet.balance + input.amount) },
  });
  await writeTxn(tx, wallet.id, input.type, input.amount, input.refType, input.refId, input.note);
}

async function hold(
  tx: Tx,
  input: { userId: string; amount: number; refType: 'session' | 'withdrawal'; refId: string },
) {
  if (input.amount <= 0) throw new AppError('INVALID_AMOUNT', 400);
  const wallet = await lockWallet(tx, input.userId);
  const available = round2(wallet.balance - wallet.held);
  if (available < input.amount) throw new AppError('INSUFFICIENT_BALANCE', 402);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { held: round2(wallet.held + input.amount) },
  });
  await writeTxn(tx, wallet.id, 'hold', input.amount, input.refType, input.refId);
}

async function release(
  tx: Tx,
  input: { userId: string; amount: number; refType?: string; refId?: string },
) {
  if (input.amount <= 0) return;
  const wallet = await lockWallet(tx, input.userId);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { held: round2(Math.max(0, wallet.held - input.amount)) },
  });
  await writeTxn(tx, wallet.id, 'release', -input.amount, input.refType, input.refId);
}

async function settleSession(
  tx: Tx,
  input: { sessionId: string; customerId: string; ownerId: string; heldAmount: number; cost: number },
) {
  if (input.cost < 0 || input.cost > input.heldAmount) {
    throw new AppError('VALIDATION_ERROR', 400, 'Cost must be between 0 and the held amount');
  }

  const commission = round2(input.cost * COMMISSION_RATE);
  const ownerEarning = round2(input.cost - commission);
  const unusedHold = round2(input.heldAmount - input.cost);

  const customerWallet = await lockWallet(tx, input.customerId);
  const ownerWallet = await lockWallet(tx, input.ownerId);
  const platformWallet = await lockWallet(tx, null);

  await tx.wallet.update({
    where: { id: customerWallet.id },
    data: {
      balance: round2(customerWallet.balance - input.cost),
      held: round2(customerWallet.held - input.heldAmount),
    },
  });
  await writeTxn(tx, customerWallet.id, 'charge', -input.cost, 'session', input.sessionId);
  if (unusedHold > 0) {
    await writeTxn(tx, customerWallet.id, 'release', -unusedHold, 'session', input.sessionId);
  }

  await tx.wallet.update({
    where: { id: ownerWallet.id },
    data: { balance: round2(ownerWallet.balance + ownerEarning) },
  });
  await writeTxn(tx, ownerWallet.id, 'earning', ownerEarning, 'session', input.sessionId);

  await tx.wallet.update({
    where: { id: platformWallet.id },
    data: { balance: round2(platformWallet.balance + commission) },
  });
  await writeTxn(tx, platformWallet.id, 'commission', commission, 'session', input.sessionId);

  return { commission };
}

async function payoutHeld(tx: Tx, input: { userId: string; amount: number; withdrawalId: string }) {
  const wallet = await lockWallet(tx, input.userId);
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: round2(wallet.balance - input.amount),
      held: round2(wallet.held - input.amount),
    },
  });
  await writeTxn(tx, wallet.id, 'withdrawal', -input.amount, 'withdrawal', input.withdrawalId);
}

async function emitWalletUpdates(userIds: string[]) {
  for (const userId of userIds) {
    const wallet = await getWallet(userId);
    emitToUser(userId, 'wallet:updated', wallet);
  }
}

export const credit = {
  createWallet,
  getWallet,
  credit: creditFn,
  hold,
  release,
  settleSession,
  payoutHeld,
  emitWalletUpdates,
};
