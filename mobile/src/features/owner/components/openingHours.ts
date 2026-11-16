export type ParsedOpeningHours = {
  openingTime: string;
  closingTime: string;
  open24Hours: boolean;
};

export const DEFAULT_OPENING_TIME = '08:00';
export const DEFAULT_CLOSING_TIME = '22:00';

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const minutePart = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutePart}`;
});

function parseTime(value: string): string | null {
  const match = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)?$/i.exec(value.trim());
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'AM') hour %= 12;
    else if (hour !== 12) hour += 12;
  } else if (hour > 23) {
    return null;
  }

  const normalized = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return TIME_OPTIONS.includes(normalized) ? normalized : null;
}

export function formatTimeLabel(value: string): string {
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const meridiem = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  return `${displayHour.toString().padStart(2, '0')}:${minuteText} ${meridiem}`;
}

export function parseOpeningHours(value: string): ParsedOpeningHours | null {
  const trimmed = value.trim();
  if (/^(?:24\s*hours?|open\s*24\s*hours|24\/7)$/i.test(trimmed)) {
    return { openingTime: DEFAULT_OPENING_TIME, closingTime: DEFAULT_CLOSING_TIME, open24Hours: true };
  }

  const range = /^(.+?)\s*(?:–|—|-|\bto\b)\s*(.+)$/i.exec(trimmed);
  if (!range) return null;

  const openingTime = parseTime(range[1]);
  const closingTime = parseTime(range[2]);
  if (!openingTime || !closingTime) return null;

  return { openingTime, closingTime, open24Hours: false };
}

export function serializeOpeningHours(
  openingTime: string,
  closingTime: string,
  open24Hours: boolean,
): string {
  return open24Hours ? '24 hours' : `${openingTime} – ${closingTime}`;
}

export function hasDistinctOpeningAndClosingTimes(value: string): boolean {
  const parsed = parseOpeningHours(value);
  return !parsed || parsed.open24Hours || parsed.openingTime !== parsed.closingTime;
}
