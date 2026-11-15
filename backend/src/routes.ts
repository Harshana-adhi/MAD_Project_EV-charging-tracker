import { Router } from 'express';
import { router as authRouter } from './modules/auth/auth.routes';
import { router as walletRouter } from './modules/wallet/wallet.routes';
import { router as profileRouter } from './modules/profile/profile.routes';
import { router as vehiclesRouter } from './modules/vehicles/vehicles.routes';
import { router as transactionsRouter } from './modules/transactions/transactions.routes';
import { router as topupsRouter } from './modules/topups/topups.routes';
import { router as adminRouter } from './modules/admin/admin.routes';
import { router as stationsRouter } from './modules/stations/stations.routes';
import { router as reviewsRouter } from './modules/reviews/reviews.routes';
import { router as favouritesRouter } from './modules/favourites/favourites.routes';
import { router as notificationsRouter } from './modules/notifications/notifications.routes';
import { router as ownerRouter } from './modules/owner/owner.routes';
import { router as sessionsRouter } from './modules/sessions/sessions.routes';
import { router as reportsRouter } from './modules/reports/reports.routes';

export const routes = Router();

routes.get('/health', (req, res) => res.json({ ok: true }));

routes.use('/auth', authRouter);
routes.use('/wallet', walletRouter);
routes.use('/profile', profileRouter);
routes.use('/vehicles', vehiclesRouter);
routes.use('/transactions', transactionsRouter);
routes.use('/topups', topupsRouter);
routes.use('/admin', adminRouter);
routes.use('/stations', stationsRouter);
routes.use('/reviews', reviewsRouter);
routes.use('/favourites', favouritesRouter);
routes.use('/notifications', notificationsRouter);
routes.use('/owner', ownerRouter);
routes.use('/sessions', sessionsRouter);
routes.use('/reports', reportsRouter);
