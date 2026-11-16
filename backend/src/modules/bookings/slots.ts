import { broadcast } from '../../core/socket';

// Asia/Colombo has a fixed UTC+5:30 offset and no DST, so a plain millisecond
// shift is enough to read/write it from a UTC Date – no timezone library needed.
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toColombo(date: Date): Date {
  return new Date(date.getTime() + COLOMBO_OFFSET_MS);
}

export function colomboDateString(date: Date): string {
  return toColombo(date).toISOString().slice(0, 10);
}

export function colomboMinutesOfDay(date: Date): number {
  const shifted = toColombo(date);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

// The UTC instant that is 00:00 Colombo time on the given YYYY-MM-DD day.
export function colomboDayStartUtc(dateStr: string): Date {
  return new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - COLOMBO_OFFSET_MS);
}

type OpeningHours = { openMin: number; closeMin: number };

// openingHours is free text ("06:00-22:00", "24 hours", ...). Only the HH:MM-HH:MM
// shape is parsed; anything else (like "24 hours") is treated as always open.
function parseOpeningHours(openingHours: string): OpeningHours | null {
  const match = openingHours.trim().match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
  if (!match) return null;
  const openMin = Number(match[1]) * 60 + Number(match[2]);
  let closeMin = Number(match[3]) * 60 + Number(match[4]);
  if (closeMin <= openMin) closeMin += 24 * 60;
  return { openMin, closeMin };
}

// startMin/endMin are minutes-of-day in Colombo time, with endMin = startMin + duration
// (never derived from the end instant's own minutes-of-day, which would wrap at midnight).
export function isWithinOpeningHours(openingHours: string, startMin: number, endMin: number): boolean {
  const hours = parseOpeningHours(openingHours);
  if (!hours) return true;
  return startMin >= hours.openMin && endMin <= hours.closeMin;
}

export function broadcastBookingChanged(chargerId: string, stationId: string, startAt: Date) {
  broadcast('booking:changed', { chargerId, stationId, date: colomboDateString(startAt) });
}
