import { prisma } from './db';
import { endSession, hasReachedSpendingLimit, msUntilSpendingLimit } from '../modules/sessions/sessions.service';
import { scheduleSessionAutoEnd } from './sessionTimers';

// The meter simulation caps energy (and so cost) at the spending limit, but nothing was
// ever watching for that happening — the session just sat "active" and the charger
// "busy" until the customer opened the app and pressed Stop. startSession schedules an
// exact one-shot timer per session now (see sessionTimers.ts), so the charger frees up
// the instant the limit is reached. This periodic sweep is just the backstop for a timer
// that got lost – a server restart, most likely – checked often since the demo meter
// runs 60x real time.
async function runSessionSweep(): Promise<void> {
  const now = new Date();
  const activeSessions = await prisma.session.findMany({
    where: { status: 'active' },
    include: { charger: true },
  });

  for (const session of activeSessions) {
    const powerKw = session.charger.powerKw.toNumber();
    const ratePerKwh = (session.ratePerKwh ?? session.charger.ratePerKwh).toNumber();
    const spendingLimit = session.spendingLimit.toNumber();
    if (!hasReachedSpendingLimit(powerKw, ratePerKwh, spendingLimit, session.startedAt, now)) continue;

    try {
      // No customerId: the system is ending this, not the customer. endSession re-checks
      // status === 'active' under its own row lock, so a session someone just stopped by
      // hand is simply skipped here rather than double-ended.
      await endSession(session.id);
    } catch (err) {
      console.error('session auto-end failed', session.id, err);
    }
  }
}

// Restores exact per-session timers for whatever was already "active" when this process
// started (e.g. after a deploy or crash) – otherwise those sessions would only be caught
// by the next backstop sweep, up to 10s late, instead of ending the instant they're due.
async function rescheduleActiveSessions(): Promise<void> {
  const now = new Date();
  const activeSessions = await prisma.session.findMany({ where: { status: 'active' }, include: { charger: true } });
  for (const session of activeSessions) {
    const powerKw = session.charger.powerKw.toNumber();
    const ratePerKwh = (session.ratePerKwh ?? session.charger.ratePerKwh).toNumber();
    const spendingLimit = session.spendingLimit.toNumber();
    const delayMs = msUntilSpendingLimit(powerKw, ratePerKwh, spendingLimit, session.startedAt, now);
    scheduleSessionAutoEnd(session.id, delayMs, () => {
      endSession(session.id).catch((err) => console.error('session auto-end failed', session.id, err));
    });
  }
}

export function startSessionJobs(): NodeJS.Timeout {
  rescheduleActiveSessions().catch((err) => console.error('session timer restore failed', err));

  // Far more frequent than the booking sweep: the demo meter runs 60x real time, so a
  // session can hit its limit within a minute or two of being started.
  return setInterval(() => {
    runSessionSweep().catch((err) => console.error('session sweep failed', err));
  }, 10_000);
}

export { runSessionSweep };
