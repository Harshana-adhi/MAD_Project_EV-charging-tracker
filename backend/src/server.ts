import { createServer } from 'http';
import { app } from './app';
import { config } from './config';
import { initSocket, startRealtimeRelay } from './core/socket';
import { startBookingJobs } from './core/booking.jobs';
import { startSessionJobs } from './core/session.jobs';
import { startChargerJobs } from './core/charger.jobs';

const httpServer = createServer(app);
initSocket(httpServer);
void startRealtimeRelay();
startBookingJobs();
startSessionJobs();
startChargerJobs();

httpServer.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
