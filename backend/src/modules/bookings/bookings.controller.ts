import type { Request, Response } from 'express';
import * as service from './bookings.service';

export async function listForStation(req: Request, res: Response) {
  const query = req.query as unknown as { date: string };
  res.json({ data: await service.listStationBookings(req.params.id, query.date) });
}

export async function create(req: Request, res: Response) {
  const booking = await service.createBooking(req.user!.id, req.body);
  res.status(201).json({ data: booking });
}

export async function listMine(req: Request, res: Response) {
  res.json({ data: await service.listMyBookings(req.user!.id) });
}

export async function cancel(req: Request, res: Response) {
  res.json({ data: await service.cancelBooking(req.params.id, req.user!.id) });
}

export async function historyForOwner(req: Request, res: Response) {
  res.json({ data: await service.listOwnerBookingHistory(req.user!.id) });
}

export async function listForOwner(req: Request, res: Response) {
  res.json({ data: await service.listOwnerBookings(req.user!.id) });
}
