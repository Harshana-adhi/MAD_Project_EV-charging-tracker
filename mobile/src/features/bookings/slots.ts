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

type OpeningHours = { openMin: number; closeMin: number };

function parseOpeningHours(openingHours: string): OpeningHours | null {
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
export function generateSlotStarts(openingHours: string, dateValue: string, durationMinutes: 30 | 60): Date[] {
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
