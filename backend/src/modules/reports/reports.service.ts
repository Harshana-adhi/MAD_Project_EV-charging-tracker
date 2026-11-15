import { prisma } from '../../core/db';
import { AppError } from '../../core/errors';
import type { IncomePeriod } from './reports.schema';

// Reports follow the same rules as the owner earnings screen: completed and disputed sessions,
// grouped by the Sri Lanka date they ended on.
const CHARGED_STATUSES = ['completed', 'disputed'] as const;
const PERIOD_COUNT: Record<IncomePeriod, number> = { day: 14, month: 12, year: 5 };
const STATEMENT_MONTHS = 12;

type Totals = { income: number; charged: number; sessions: number; kwh: number };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyTotals(): Totals {
  return { income: 0, charged: 0, sessions: 0, kwh: 0 };
}

function colomboDay(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function keyFor(value: Date, period: IncomePeriod): string {
  const day = colomboDay(value);
  if (period === 'year') return day.slice(0, 4);
  if (period === 'month') return day.slice(0, 7);
  return day;
}

function periodOfKey(key: string): IncomePeriod {
  if (key.length === 4) return 'year';
  if (key.length === 7) return 'month';
  return 'day';
}

// Start of the period in Sri Lanka time, and the start of the next one.
function rangeOf(key: string): { start: Date; end: Date } {
  const period = periodOfKey(key);
  const [year, month = 1, day = 1] = key.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(start);
  if (period === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + 1);
  const toColombo = (date: Date) =>
    new Date(`${date.toISOString().slice(0, 10)}T00:00:00+05:30`);
  return { start: toColombo(start), end: toColombo(end) };
}

function previousKey(key: string): string {
  const period = periodOfKey(key);
  const [year, month = 1, day = 1] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (period === 'year') date.setUTCFullYear(date.getUTCFullYear() - 1);
  else if (period === 'month') date.setUTCMonth(date.getUTCMonth() - 1);
  else date.setUTCDate(date.getUTCDate() - 1);
  const iso = date.toISOString();
  return period === 'year' ? iso.slice(0, 4) : period === 'month' ? iso.slice(0, 7) : iso.slice(0, 10);
}

function recentKeys(period: IncomePeriod, count: number): string[] {
  const keys = [keyFor(new Date(), period)];
  while (keys.length < count) keys.push(previousKey(keys[keys.length - 1]));
  return keys;
}

function chargedSessionsBetween(start: Date, end: Date) {
  return prisma.session.findMany({
    where: { status: { in: [...CHARGED_STATUSES] }, endedAt: { gte: start, lt: end } },
    select: {
      endedAt: true,
      cost: true,
      commission: true,
      kwh: true,
      station: { select: { name: true, owner: { select: { id: true, fullName: true } } } },
    },
  });
}

type ChargedSession = Awaited<ReturnType<typeof chargedSessionsBetween>>[number];

function addSession(totals: Totals, session: ChargedSession) {
  totals.income += session.commission?.toNumber() ?? 0;
  totals.charged += session.cost?.toNumber() ?? 0;
  totals.kwh += session.kwh?.toNumber() ?? 0;
  totals.sessions += 1;
}

function rounded(totals: Totals): Totals {
  return {
    income: round2(totals.income),
    charged: round2(totals.charged),
    sessions: totals.sessions,
    kwh: round2(totals.kwh),
  };
}

export async function listIncome(period: IncomePeriod) {
  const keys = recentKeys(period, PERIOD_COUNT[period]);
  const oldest = rangeOf(keys[keys.length - 1]).start;
  const newest = rangeOf(keys[0]).end;
  const sessions = await chargedSessionsBetween(oldest, newest);

  const byKey = new Map(keys.map((key) => [key, emptyTotals()]));
  for (const session of sessions) {
    const totals = byKey.get(keyFor(session.endedAt as Date, period));
    if (totals) addSession(totals, session);
  }
  return keys.map((key) => ({ key, ...rounded(byKey.get(key) as Totals) }));
}

export async function getIncomeDetail(key: string) {
  const { start, end } = rangeOf(key);
  const sessions = await chargedSessionsBetween(start, end);

  const totals = emptyTotals();
  const owners = new Map<string, { ownerId: string; ownerName: string; earned: number; sessions: number }>();
  for (const session of sessions) {
    addSession(totals, session);
    const owner = session.station.owner;
    const row = owners.get(owner.id) ?? { ownerId: owner.id, ownerName: owner.fullName, earned: 0, sessions: 0 };
    row.earned += (session.cost?.toNumber() ?? 0) - (session.commission?.toNumber() ?? 0);
    row.sessions += 1;
    owners.set(owner.id, row);
  }

  return {
    key,
    ...rounded(totals),
    owners: [...owners.values()]
      .map((row) => ({ ...row, earned: round2(row.earned) }))
      .sort((a, b) => b.earned - a.earned),
  };
}

export async function getOwnerStatement(ownerId: string, month?: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner || owner.role !== 'owner') throw new AppError('NOT_FOUND', 404);

  const selectedMonth = month ?? keyFor(new Date(), 'month');
  const { start, end } = rangeOf(selectedMonth);
  const historyStart = rangeOf(recentKeys('month', STATEMENT_MONTHS)[STATEMENT_MONTHS - 1]).start;
  const wallet = await prisma.wallet.findUnique({ where: { userId: ownerId }, select: { id: true } });

  const [sessions, history, payouts] = await Promise.all([
    prisma.session.findMany({
      where: {
        station: { ownerId },
        status: { in: [...CHARGED_STATUSES] },
        endedAt: { gte: start, lt: end },
      },
      select: { cost: true, commission: true, kwh: true, station: { select: { name: true } } },
    }),
    prisma.session.findMany({
      where: {
        station: { ownerId },
        status: { in: [...CHARGED_STATUSES] },
        endedAt: { gte: historyStart },
      },
      select: { endedAt: true },
    }),
    wallet
      ? prisma.transaction.findMany({
          where: { walletId: wallet.id, type: 'withdrawal', createdAt: { gte: start, lt: end } },
          select: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  let charged = 0;
  let commission = 0;
  let kwh = 0;
  const byStation = new Map<string, number>();
  for (const session of sessions) {
    const cost = session.cost?.toNumber() ?? 0;
    const fee = session.commission?.toNumber() ?? 0;
    charged += cost;
    commission += fee;
    kwh += session.kwh?.toNumber() ?? 0;
    byStation.set(session.station.name, (byStation.get(session.station.name) ?? 0) + cost - fee);
  }
  const best = [...byStation.entries()].sort((a, b) => b[1] - a[1])[0];

  const months = new Set([keyFor(new Date(), 'month'), selectedMonth]);
  for (const session of history) months.add(keyFor(session.endedAt as Date, 'month'));

  return {
    ownerId,
    ownerName: owner.fullName,
    month: selectedMonth,
    charged: round2(charged),
    commission: round2(commission),
    earned: round2(charged - commission),
    withdrawalsPaid: round2(payouts.reduce((sum, row) => sum - row.amount.toNumber(), 0)),
    sessions: sessions.length,
    kwh: round2(kwh),
    bestStation: best ? { name: best[0], earned: round2(best[1]) } : null,
    months: [...months].sort().reverse(),
  };
}
