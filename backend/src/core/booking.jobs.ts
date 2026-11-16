import { prisma } from './db';
import { notify } from './notify.service';
import { broadcastBookingChanged } from '../modules/bookings/slots';

const WARNING_AFTER_MS = 10 * 60 * 1000;
const EXPIRE_AFTER_MS = 15 * 60 * 1000;

const withNames = { charger: true, station: { select: { name: true, ownerId: true } } } as const;

// Each step claims a row with a conditional updateMany (count === 1 means this run won
// the race) before sending anything, so running the sweep twice at once – two instances,
// or the cron endpoint firing while the in-process timer also runs – never double-sends.
async function runReminderStep(now: Date) {
  const due = await prisma.booking.findMany({
    where: { status: 'booked', reminderSentAt: null, startAt: { lte: now } },
    include: withNames,
  });
  for (const booking of due) {
    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (count === 0) continue;
    await notify({
      userId: booking.customerId,
      title: 'Your booking has started',
      body: `Your booking at ${booking.station.name} – ${booking.charger.label} has started. Scan the charger QR within 15 minutes or the booking will be cancelled.`,
      type: 'booking_reminder',
      refId: booking.id,
      email: true,
    });
  }
}

async function runWarningStep(now: Date) {
  const due = await prisma.booking.findMany({
    where: {
      status: 'booked',
      warningSentAt: null,
      startAt: { lte: new Date(now.getTime() - WARNING_AFTER_MS) },
    },
    include: withNames,
  });
  for (const booking of due) {
    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, warningSentAt: null },
      data: { warningSentAt: now },
    });
    if (count === 0) continue;
    await notify({
      userId: booking.customerId,
      title: 'Booking about to be cancelled',
      body: '5 minutes left to start charging, or your booking will be cancelled.',
      type: 'booking_warning',
      refId: booking.id,
      email: true,
    });
  }
}

async function runExpireStep(now: Date) {
  const due = await prisma.booking.findMany({
    where: { status: 'booked', startAt: { lte: new Date(now.getTime() - EXPIRE_AFTER_MS) } },
    include: withNames,
  });
  for (const booking of due) {
    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, status: 'booked' },
      data: { status: 'expired' },
    });
    if (count === 0) continue;
    broadcastBookingChanged(booking.chargerId, booking.stationId, booking.startAt);
    await notify({
      userId: booking.customerId,
      title: 'Booking cancelled',
      body: "Your booking was cancelled because charging didn't start within 15 minutes.",
      type: 'booking_expired',
      refId: booking.id,
      email: true,
    });
    await notify({
      userId: booking.station.ownerId,
      title: 'Booking cancelled',
      body: 'A booking on one of your chargers was cancelled (no-show).',
      type: 'booking_cancelled',
      refId: booking.id,
    });
  }
}

export async function runBookingSweep(): Promise<void> {
  const now = new Date();
  await runReminderStep(now);
  await runWarningStep(now);
  await runExpireStep(now);
}

export function startBookingJobs(): NodeJS.Timeout {
  return setInterval(() => {
    runBookingSweep().catch((err) => console.error('booking sweep failed', err));
  }, 60_000);
}
