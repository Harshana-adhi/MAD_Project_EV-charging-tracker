import type { Request, Response } from 'express';
import * as profileService from './profile.service';

export async function getProfile(req: Request, res: Response) {
  const user = await profileService.getProfile(req.user!.id);
  res.json({ data: user });
}

export async function updateProfile(req: Request, res: Response) {
  const user = await profileService.updateProfile(req.user!.id, req.body);
  res.json({ data: user });
}
