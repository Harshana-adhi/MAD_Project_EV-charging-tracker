import { formatClock } from '@/lib/format';
import { addDays, colomboDateString, formatDay } from './slots';

// "Today", "Tomorrow" or "Wed, Nov 18" for a booking's start, in Colombo time.
export function bookingDayLabel(iso: string): string {
  const day = colomboDateString(new Date(iso));
  const today = colomboDateString(new Date());
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return formatDay(day);
}

// "10:00 AM – 11:30 AM"
export function bookingTimeRange(startIso: string, endIso: string): string {
  return `${formatClock(startIso)} – ${formatClock(endIso)}`;
}

// "1 h 30 min"
export function bookingLength(startIso: string, endIso: string): string {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
