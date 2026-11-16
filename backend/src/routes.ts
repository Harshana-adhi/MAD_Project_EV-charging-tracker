import { Router } from 'express';
import { config } from './config';
import { runBookingSweep } from './core/booking.jobs';
import { runSessionSweep } from './core/session.jobs';
import { router as authRouter } from './modules/auth/auth.routes';
import { router as walletRouter } from './modules/wallet/wallet.routes';
import { router as profileRouter } from './modules/profile/profile.routes';
import { router as vehiclesRouter } from './modules/vehicles/vehicles.routes';
import { router as transactionsRouter } from './modules/transactions/transactions.routes';
import { router as topupsRouter } from './modules/topups/topups.routes';
import { router as adminRouter } from './modules/admin/admin.routes';
import { router as stationsRouter } from './modules/stations/stations.routes';
import { router as reviewsRouter, stationReviewsRouter } from './modules/reviews/reviews.routes';
import { router as favouritesRouter } from './modules/favourites/favourites.routes';
import { router as notificationsRouter } from './modules/notifications/notifications.routes';
import { router as ownerRouter } from './modules/owner/owner.routes';
import { router as sessionsRouter } from './modules/sessions/sessions.routes';
import { router as reportsRouter } from './modules/reports/reports.routes';
import { router as passwordRouter } from './modules/password/password.routes';
import {
  router as bookingsRouter,
  stationBookingsRouter,
  ownerBookingsRouter,
} from './modules/bookings/bookings.routes';

export const routes = Router();

routes.get('/health', (req, res) => res.json({ ok: true }));

// Render's free plan sleeps the app after 15 minutes idle, so the in-process timers
// (started in server.ts) can't be relied on alone. An external free cron hits this every
// minute instead, both to wake the app up and to run both sweeps directly.
routes.post('/internal/run-booking-jobs', (req, res, next) => {
  if (!config.cronSecret || req.header('x-cron-secret') !== config.cronSecret) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid cron secret' } });
  }
  Promise.all([runBookingSweep(), runSessionSweep()])
    .then(() => res.json({ ok: true }))
    .catch(next);
});

routes.use('/auth', authRouter);
routes.use('/wallet', walletRouter);
routes.use('/profile', profileRouter);
routes.use('/vehicles', vehiclesRouter);
routes.use('/transactions', transactionsRouter);
routes.use('/topups', topupsRouter);
routes.use('/admin', adminRouter);
routes.use('/stations', stationReviewsRouter);
routes.use('/stations', stationBookingsRouter);
routes.use('/stations', stationsRouter);
routes.use('/reviews', reviewsRouter);
routes.use('/favourites', favouritesRouter);
routes.use('/notifications', notificationsRouter);
routes.use('/owner', ownerRouter);
routes.use('/owner', ownerBookingsRouter);
routes.use('/sessions', sessionsRouter);
routes.use('/bookings', bookingsRouter);
routes.use('/reports', reportsRouter);
routes.use('/password', passwordRouter);
