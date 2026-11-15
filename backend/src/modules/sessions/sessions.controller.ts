import type { Request, Response } from 'express';
import * as service from './sessions.service';

export async function lookup(req: Request, res: Response) {
  res.json({ data: await service.getChargerByQr(req.params.qrToken, req.user!.id) });
}

export async function start(req: Request, res: Response) {
  const session = await service.startSession(req.user!.id, req.body);
  res.status(201).json({ data: session });
}

export async function end(req: Request, res: Response) {
  res.json({ data: await service.endSession(req.params.id, req.user!.id, req.body.kwh) });
}

export async function cancel(req: Request, res: Response) {
  res.json({ data: await service.cancelSession(req.params.id, req.user!.id) });
}

export async function active(req: Request, res: Response) {
  res.json({ data: await service.getActiveSession(req.user!.id) });
}

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listMySessions(req.user!.id) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getSession(req.params.id, req.user!.id) });
}
