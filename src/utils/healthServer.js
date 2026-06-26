import express from 'express';
import { logger } from './logger.js';

export function startHealthServer() {
  const port = process.env.PORT ?? 3000;
  const app  = express();

  app.get('/health', (_, res) => res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
  }));

  app.get('/', (_, res) => res.json({ name: 'Jarvis-FavBot', status: 'online' }));

  app.listen(port, () => logger.info(`Health server en puerto ${port}`));
}
