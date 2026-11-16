// Mirrors backend/src/modules/bookings/slots.ts – Asia/Colombo is a fixed UTC+5:30
// offset with no DST, so a plain millisecond shift is enough, no timezone library needed.
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function colomboDateString(date: Date): string {
  return new Date(date.getTime() + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
}

export function nextSevenDays(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const value = colomboDateString(d);
    const weekday = new Date(`${value}T00:00:00+05:30`).toLocaleDateString('en-LK', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const prefix = i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : '';
    return { value, label: `${prefix}${weekday}` };
  });
}

export type OpeningHours = { openMin: number; closeMin: number };

export function parseOpeningHours(openingHours: string): OpeningHours | null {
  const match = openingHours.trim().match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
  if (!match) return null;
  const openMin = Number(match[1]) * 60 + Number(match[2]);
  let closeMin = Number(match[3]) * 60 + Number(match[4]);
  if (closeMin <= openMin) closeMin += 24 * 60;
  return { openMin, closeMin };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Every on-the-hour/half-hour slot start, for one Colombo calendar day, that fully fits
// inside opening hours and isn't in the past or more than 7 days out.
export function generateSlotStarts(openingHours: string, dateValue: string, durationMinutes: number): Date[] {
  const hours = parseOpeningHours(openingHours) ?? { openMin: 0, closeMin: 24 * 60 };
  const dayStartUtcMs = new Date(`${dateValue}T00:00:00.000Z`).getTime() - COLOMBO_OFFSET_MS;
  const now = Date.now();
  const starts: Date[] = [];
  for (let min = hours.openMin; min + durationMinutes <= hours.closeMin; min += 30) {
    const startAt = new Date(dayStartUtcMs + min * 60 * 1000);
    if (startAt.getTime() < now) continue;
    if (startAt.getTime() > now + SEVEN_DAYS_MS) continue;
    starts.push(startAt);
  }
  return starts;
}

// A date string shifted by whole days, e.g. addDays('2026-11-30', 1) -> '2026-12-01'.
export function addDays(dateValue: string, days: number): string {
  return new Date(new Date(`${dateValue}T00:00:00.000Z`).getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// e.g. 'Tue, 17 Nov'
export function formatDay(dateValue: string): string {
  return new Date(`${dateValue}T00:00:00+05:30`).toLocaleDateString('en-LK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Colombo',
  });
}

// Reads a typed time like "14:30", "9:00" or "0930" as minutes of the day, or null.
export function parseTypedTime(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

// The instant a Colombo wall-clock time on a Colombo date happens.
export function colomboInstant(dateValue: string, minutesOfDay: number): Date {
  return new Date(new Date(`${dateValue}T00:00:00.000Z`).getTime() - COLOMBO_OFFSET_MS + minutesOfDay * 60 * 1000);
}

export type TimeRange = { start: Date; end: Date };

// The open stretches of one Colombo day on one port: opening hours minus bookings, and for
// today minus the time already gone (rounded up to the next half hour).
export function freeWindows(openingHours: string, dateValue: string, booked: TimeRange[]): TimeRange[] {
  const hours = parseOpeningHours(openingHours) ?? { openMin: 0, closeMin: 24 * 60 };
  let cursor = colomboInstant(dateValue, hours.openMin).getTime();
  const close = colomboInstant(dateValue, hours.closeMin).getTime();
  const halfHour = 30 * 60 * 1000;
  cursor = Math.max(cursor, Math.ceil(Date.now() / halfHour) * halfHour);

  const windows: TimeRange[] = [];
  const sorted = [...booked].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const range of sorted) {
    if (range.start.getTime() > cursor) {
      windows.push({ start: new Date(cursor), end: new Date(Math.min(range.start.getTime(), close)) });
    }
    cursor = Math.max(cursor, range.end.getTime());
    if (cursor >= close) break;
  }
  if (cursor < close) windows.push({ start: new Date(cursor), end: new Date(close) });
  return windows.filter((window) => window.end > window.start);
}

// Most a customer pays if the charger runs at full power for the whole slot.
export function slotCost(powerKw: number, ratePerKwh: number, minutes: number): number {
  return Math.round(powerKw * (minutes / 60) * ratePerKwh);
}

// Minutes since Colombo midnight for an instant, e.g. 10:30 -> 630.
export function colomboMinutes(date: Date): number {
  return Math.floor(((date.getTime() + COLOMBO_OFFSET_MS) % (24 * 60 * 60 * 1000)) / 60000);
}

// "10:30 AM" style, in Colombo time. Midnight at the end of a day reads "12:00 AM".
export function formatClock(date: Date): string {
  const minutes = colomboMinutes(date);
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
}

// 630 -> "10:30"
export function minutesToText(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
