import type { Request, Response } from 'express';
import * as sessionsService from './sessions.service';

export async function startSession(req: Request, res: Response) {
  const session = await sessionsService.startSession(req.user!.id, req.body);
  res.status(201).json({ data: session });
}

export async function stopSession(req: Request, res: Response) {
  const session = await sessionsService.stopSession(req.user!.id, req.params.id, req.body);
  res.json({ data: session });
}

export async function cancelSession(req: Request, res: Response) {
  const session = await sessionsService.cancelSession(req.user!.id, req.params.id);
  res.json({ data: session });
}

export async function getSession(req: Request, res: Response) {
  const session = await sessionsService.getSession(req.user!.id, req.user!.role, req.params.id);
  res.json({ data: session });
}

export async function listMySessions(req: Request, res: Response) {
  const sessions = await sessionsService.listMySessions(req.user!.id);
  res.json({ data: sessions });
}
