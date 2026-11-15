import type { Request, Response } from 'express';
import * as passwordService from './password.service';

export async function changePassword(req: Request, res: Response) {
  const result = await passwordService.changePassword(req.user!.id, req.body);
  res.json({ data: result });
}

export async function requestPasswordReset(req: Request, res: Response) {
  const result = await passwordService.requestPasswordReset(req.body.email);
  res.json({ data: result });
}

export async function resetPassword(req: Request, res: Response) {
  const result = await passwordService.resetPassword(req.body);
  res.json({ data: result });
}
