import type { Request, Response } from 'express';
import * as reportsService from './reports.service';
import type { IncomePeriod } from './reports.schema';

export async function listIncome(req: Request, res: Response) {
  const rows = await reportsService.listIncome(req.query.period as IncomePeriod);
  res.json({ data: rows });
}

export async function getIncomeDetail(req: Request, res: Response) {
  const detail = await reportsService.getIncomeDetail(req.params.key);
  res.json({ data: detail });
}

export async function getOwnerStatement(req: Request, res: Response) {
  const statement = await reportsService.getOwnerStatement(
    req.params.ownerId,
    req.query.month as string | undefined,
  );
  res.json({ data: statement });
}

export async function getMyStatement(req: Request, res: Response) {
  const statement = await reportsService.getOwnerStatement(
    req.user!.id,
    req.query.month as string | undefined,
  );
  res.json({ data: statement });
}
