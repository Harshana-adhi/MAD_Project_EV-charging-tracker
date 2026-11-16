import type { SessionWithNames } from '@/types/domain';

// Must match METER_SPEED in backend/src/modules/sessions/sessions.service.ts, which bills the session.
export const SPEED = 60;

export function meterReading(session: SessionWithNames, now: number) {
  const elapsedMs = Math.max(0, now - Date.parse(session.startedAt));
  const simulatedSeconds = elapsedMs * SPEED / 1000;
  const kwh = session.powerKw * (elapsedMs * SPEED / 3600000);
  const cost = Math.min(kwh * session.ratePerKwh, session.spendingLimit);
  return { kwh, cost, simulatedSeconds, progress: Math.min(1, cost / session.spendingLimit) };
}
