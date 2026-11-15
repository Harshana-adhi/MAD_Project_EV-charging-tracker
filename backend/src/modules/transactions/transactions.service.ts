import type { TxnType } from '@prisma/client';
import { prisma } from '../../core/db';

export async function listTransactions(userId: string, type?: TxnType) {
  const rows = await prisma.transaction.findMany({
    where: { wallet: { userId }, type },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
    select: {
      id: true,
      type: true,
      amount: true,
      refType: true,
      refId: true,
      note: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({ ...row, amount: row.amount.toNumber() }));
}
