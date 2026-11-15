import type { Request, Response } from 'express';
import * as adminService from './admin.service';

export async function getCounts(req: Request, res: Response) {
  const counts = await adminService.getCounts();
  res.json({ data: counts });
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
