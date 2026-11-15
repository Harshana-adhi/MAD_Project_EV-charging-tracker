const TOKEN = /^[A-Za-z0-9_-]{8,20}$/;

export function parseQr(value: string): string | null {
  const trimmed = value.trim();
  const token = trimmed.startsWith('evcharge://charge/')
    ? trimmed.slice('evcharge://charge/'.length)
    : trimmed;
  return TOKEN.test(token) ? token : null;
}
