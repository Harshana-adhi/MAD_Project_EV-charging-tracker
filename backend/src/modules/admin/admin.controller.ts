import type { Request, Response } from 'express';
import type { RequestStatus, StationStatus, WithdrawalStatus } from '@prisma/client';
import * as adminService from './admin.service';

export async function getCounts(req: Request, res: Response) {
  const counts = await adminService.getCounts();
  res.json({ data: counts });
}

export async function listStationsByStatus(req: Request, res: Response) {
  const stations = await adminService.listStationsByStatus(req.query.status as StationStatus);
  res.json({ data: stations });
}

export async function reviewStation(req: Request, res: Response) {
  const station = await adminService.reviewStation(req.params.id, req.body);
  res.json({ data: station });
}

export async function setStationHidden(req: Request, res: Response) {
  const station = await adminService.setStationHidden(req.params.id, req.body.hidden);
  res.json({ data: station });
}

export async function listTopups(req: Request, res: Response) {
  const topups = await adminService.listTopups(req.query.status as RequestStatus);
  res.json({ data: topups });
}

export async function reviewTopup(req: Request, res: Response) {
  const topup = await adminService.reviewTopup(req.user!, req.params.id, req.body);
  res.json({ data: topup });
}

export async function listWithdrawals(req: Request, res: Response) {
  const withdrawals = await adminService.listWithdrawals(req.query.status as WithdrawalStatus);
  res.json({ data: withdrawals });
}

export async function processWithdrawal(req: Request, res: Response) {
  const withdrawal = await adminService.processWithdrawal(
    req.user!,
    req.params.id,
    req.body.approve,
  );
  res.json({ data: withdrawal });
}

export async function listDisputes(req: Request, res: Response) {
  res.json({ data: await adminService.listDisputes() });
}

export async function resolveDispute(req: Request, res: Response) {
  res.json({ data: await adminService.resolveDispute(req.params.id) });
}

export async function listUsers(req: Request, res: Response) {
  const users = await adminService.listUsers(req.query.search as string | undefined);
  res.json({ data: users });
}

export async function setUserBlocked(req: Request, res: Response) {
  const user = await adminService.setUserBlocked(req.user!, req.params.id, req.body.blocked);
  res.json({ data: user });
}

export async function resetUserPassword(req: Request, res: Response) {
  const result = await adminService.resetUserPassword(req.params.id, req.body.newPassword);
  res.json({ data: result });
}
