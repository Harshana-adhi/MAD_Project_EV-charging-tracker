import type { IncomeDetail, IncomePeriod, IncomeRow, OwnerStatement } from './types';

const COUNT: Record<IncomePeriod, number> = { day: 14, month: 12, year: 5 };

function keyAt(period: IncomePeriod, back: number): string {
  const date = new Date();
  if (period === 'year') return String(date.getFullYear() - back);
  if (period === 'month') {
    date.setDate(1);
    date.setMonth(date.getMonth() - back);
    return date.toISOString().slice(0, 7);
  }
  date.setDate(date.getDate() - back);
  return date.toISOString().slice(0, 10);
}

function mockRow(key: string, index: number): IncomeRow {
  const charged = Math.max(0, 300000 - index * 18000);
  return { key, income: charged * 0.05, charged, sessions: Math.round(charged / 900), kwh: charged / 90 };
}

export async function listIncome(period: IncomePeriod): Promise<IncomeRow[]> {
  return Array.from({ length: COUNT[period] }, (_, index) => mockRow(keyAt(period, index), index));
}

export async function getIncomeDetail(key: string): Promise<IncomeDetail> {
  return {
    ...mockRow(key, 0),
    owners: [
      { ownerId: 'owner-1', ownerName: 'Station Owner One', earned: 168200, sessions: 198 },
      { ownerId: 'owner-2', ownerName: 'Station Owner Two', earned: 116800, sessions: 135 },
    ],
  };
}

function mockStatement(ownerId: string, ownerName: string, month?: string): OwnerStatement {
  const months = Array.from({ length: 4 }, (_, index) => keyAt('month', index));
  return {
    ownerId,
    ownerName,
    month: month ?? months[0],
    charged: 177050,
    commission: 8852.5,
    earned: 168197.5,
    withdrawalsPaid: 120000,
    sessions: 198,
    kwh: 2010,
    bestStation: { name: 'Kandy City Hotel Charging Point', earned: 96500 },
    months,
  };
}

export async function getOwnerStatement(ownerId: string, month?: string): Promise<OwnerStatement> {
  return mockStatement(ownerId, 'Station Owner One', month);
}

export async function getMyStatement(month?: string): Promise<OwnerStatement> {
  return mockStatement('owner-1', 'Station Owner One', month);
}
