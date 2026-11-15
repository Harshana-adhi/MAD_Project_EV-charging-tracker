export type IncomePeriod = 'day' | 'month' | 'year';

export interface IncomeRow {
  key: string;
  income: number;
  charged: number;
  sessions: number;
  kwh: number;
}

export interface OwnerIncome {
  ownerId: string;
  ownerName: string;
  earned: number;
  sessions: number;
}

export interface IncomeDetail extends IncomeRow {
  owners: OwnerIncome[];
}

export interface OwnerStatement {
  ownerId: string;
  ownerName: string;
  month: string;
  charged: number;
  commission: number;
  earned: number;
  withdrawalsPaid: number;
  sessions: number;
  kwh: number;
  bestStation: { name: string; earned: number } | null;
  months: string[];
}
