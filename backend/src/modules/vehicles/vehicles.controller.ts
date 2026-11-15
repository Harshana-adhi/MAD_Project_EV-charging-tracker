import type { Request, Response } from 'express';
import * as vehiclesService from './vehicles.service';

export async function listVehicles(req: Request, res: Response) {
  const vehicles = await vehiclesService.listVehicles(req.user!.id);
  res.json({ data: vehicles });
}

export async function createVehicle(req: Request, res: Response) {
  const vehicle = await vehiclesService.createVehicle(req.user!.id, req.body);
  res.status(201).json({ data: vehicle });
}

export async function updateVehicle(req: Request, res: Response) {
  const vehicle = await vehiclesService.updateVehicle(req.user!.id, req.params.id, req.body);
  res.json({ data: vehicle });
}

export async function deleteVehicle(req: Request, res: Response) {
  const result = await vehiclesService.deleteVehicle(req.user!.id, req.params.id);
  res.json({ data: result });
}
