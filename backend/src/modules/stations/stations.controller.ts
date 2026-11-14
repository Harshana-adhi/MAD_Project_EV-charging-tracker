import type { Request, Response } from 'express';
import * as stationsService from './stations.service';
import type { StationFilters } from './stations.service';

export async function listStations(req: Request, res: Response) {
  const stations = await stationsService.listStations(req.query as unknown as StationFilters);
  res.json({ data: stations });
}

export async function getStation(req: Request, res: Response) {
  const station = await stationsService.getStationById(req.params.id, req.user?.id);
  res.json({ data: station });
}
