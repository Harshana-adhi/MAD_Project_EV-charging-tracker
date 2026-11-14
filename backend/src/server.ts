import { createServer } from 'http';
import { app } from './app';
import { config } from './config';
import { initSocket } from './core/socket';

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
