import { createServer } from 'http';
import { app } from './app';
import { config } from './config';
import { initSocket } from './core/socket';
import { startBookingJobs } from './core/booking.jobs';

const httpServer = createServer(app);
initSocket(httpServer);
startBookingJobs();

httpServer.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
