import type { Request, Response } from 'express';
import * as walletService from './wallet.service';

export async function getMyWallet(req: Request, res: Response) {
  const wallet = await walletService.getMyWallet(req.user!.id);
  res.json({ data: wallet });
}

export async function topUpWithCard(req: Request, res: Response) {
  const wallet = await walletService.topUpWithCard(req.user!.id, req.body);
  res.json({ data: wallet });
}
