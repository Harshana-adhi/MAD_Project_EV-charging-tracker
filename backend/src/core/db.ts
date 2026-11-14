import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient();

export type Tx = Prisma.TransactionClient;

export function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { timeout: 10000 });
}

export function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value === null || value === undefined ? null : value.toNumber();
}
