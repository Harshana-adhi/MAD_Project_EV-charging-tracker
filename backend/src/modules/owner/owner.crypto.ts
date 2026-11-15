import { randomBytes } from 'node:crypto';

export function createChargerQrToken(): string {
  return randomBytes(9).toString('base64url');
}
