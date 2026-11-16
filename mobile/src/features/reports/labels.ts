const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Keys come from the API as YYYY, YYYY-MM or YYYY-MM-DD (Sri Lanka dates).
export function periodLabel(key: string): string {
  const [year, month, day] = key.split('-');
  if (!month) return year;
  const monthName = MONTHS[Number(month) - 1];
  if (!day) return `${monthName} ${year}`;
  return `${Number(day)} ${monthName.slice(0, 3)} ${year}`;
}

export function shortMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1].slice(0, 3)} ${year}`;
}

// The month to open on an owner statement when coming from a day, month or year row.
export function monthForKey(key: string, currentMonth: string): string {
  if (key.length >= 7) return key.slice(0, 7);
  return currentMonth.startsWith(key) ? currentMonth : `${key}-12`;
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// A short name for the period a change is compared against: "Oct", "16 Nov" or "2025".
export function comparedToLabel(key: string): string {
  const [year, month, day] = key.split('-');
  if (!month) return year;
  const monthName = MONTHS[Number(month) - 1].slice(0, 3);
  return day ? `${Number(day)} ${monthName}` : monthName;
}
