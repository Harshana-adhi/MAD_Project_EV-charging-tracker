import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../../core/errors';
import { uploadImage } from '../../core/upload';
import * as ownerService from './owner.service';

export async function listMyStations(req: Request, res: Response) {
  const stations = await ownerService.listMyStations(req.user!.id);
  res.json({ data: stations });
}

export async function getMyStationDetail(req: Request, res: Response) {
  const station = await ownerService.getMyStationDetail(req.params.id, req.user!);
  res.json({ data: station });
}

export async function createStation(req: Request, res: Response) {
  const station = await ownerService.createStation(req.user!, req.body);
  res.status(201).json({ data: station });
}

export async function updateStation(req: Request, res: Response) {
  const station = await ownerService.updateStation(req.params.id, req.user!, req.body);
  res.json({ data: station });
}

export async function deleteStation(req: Request, res: Response) {
  const result = await ownerService.deleteStation(req.params.id, req.user!);
  res.json({ data: result });
}

export async function ensurePhotoSlot(req: Request, res: Response, next: NextFunction) {
  await ownerService.assertStationCanReceivePhoto(req.params.id, req.user!);
  next();
}

export function parseStationPhoto(req: Request, res: Response, next: NextFunction) {
  uploadImage(req, res, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(new AppError('VALIDATION_ERROR', 400, 'Invalid image upload'));
    }
    next(error);
  });
}

export async function uploadStationPhoto(req: Request, res: Response) {
  const result = await ownerService.uploadStationPhoto(req.params.id, req.user!, req.file);
  res.status(201).json({ data: result });
}

export async function createCharger(req: Request, res: Response) {
  const charger = await ownerService.createCharger(req.params.id, req.user!, req.body);
  res.status(201).json({ data: charger });
}

export async function updateCharger(req: Request, res: Response) {
  const charger = await ownerService.updateCharger(req.params.id, req.user!, req.body);
  res.json({ data: charger });
}

export async function updateStationCharger(req: Request, res: Response) {
  const charger = await ownerService.updateStationCharger(
    req.params.id,
    req.params.chargerId,
    req.user!,
    req.body,
  );
  res.json({ data: charger });
}

export async function deleteCharger(req: Request, res: Response) {
  const result = await ownerService.deleteCharger(req.params.id, req.user!);
  res.json({ data: result });
}

export async function setChargerStatus(req: Request, res: Response) {
  const charger = await ownerService.setChargerStatus(
    req.params.id,
    req.user!,
    req.body.status,
    req.body.busyUntil,
  );
  res.json({ data: charger });
}

export async function listOwnerSessions(req: Request, res: Response) {
  const sessions = await ownerService.listOwnerSessions(req.user!.id);
  res.json({ data: sessions });
}

export async function disputeSession(req: Request, res: Response) {
  const session = await ownerService.disputeSession(req.params.id, req.user!, req.body.reason);
  res.json({ data: session });
}

export async function getEarnings(req: Request, res: Response) {
  const query = req.query as unknown as { from?: Date; to?: Date };
  const earnings = await ownerService.getEarnings(req.user!.id, query.from, query.to);
  res.json({ data: earnings });
}

export async function getStationEarnings(req: Request, res: Response) {
  const query = req.query as unknown as { from?: Date; to?: Date };
  const stations = await ownerService.getStationEarnings(req.user!.id, query.from, query.to);
  res.json({ data: stations });
}

export async function listMyWithdrawals(req: Request, res: Response) {
  const withdrawals = await ownerService.listMyWithdrawals(req.user!.id);
  res.json({ data: withdrawals });
}

export async function requestWithdrawal(req: Request, res: Response) {
  const withdrawal = await ownerService.requestWithdrawal(req.user!, req.body);
  res.status(201).json({ data: withdrawal });
}
