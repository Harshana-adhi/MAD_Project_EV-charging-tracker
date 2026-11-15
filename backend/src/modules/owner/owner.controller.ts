import type { Request, Response } from 'express';
import * as ownerService from './owner.service';

export async function listOwnStations(req: Request, res: Response) {
  const stations = await ownerService.listOwnStations(req.user!.id);
  res.json({ data: stations });
}

export async function getOwnStation(req: Request, res: Response) {
  const station = await ownerService.getOwnStation(req.user!.id, req.params.id);
  res.json({ data: station });
}

export async function createStation(req: Request, res: Response) {
  const station = await ownerService.createStation(req.user!.id, req.user!.fullName, req.body);
  res.status(201).json({ data: station });
}

export async function updateStation(req: Request, res: Response) {
  const station = await ownerService.updateStation(req.user!.id, req.params.id, req.body);
  res.json({ data: station });
}

export async function addCharger(req: Request, res: Response) {
  const charger = await ownerService.addCharger(req.user!.id, req.params.id, req.body);
  res.status(201).json({ data: charger });
}

export async function updateCharger(req: Request, res: Response) {
  const charger = await ownerService.updateCharger(
    req.user!.id,
    req.params.id,
    req.params.chargerId,
    req.body,
  );
  res.json({ data: charger });
}

export async function listOwnSessions(req: Request, res: Response) {
  const sessions = await ownerService.listOwnSessions(req.user!.id);
  res.json({ data: sessions });
}
