import express from 'express';
import axios from 'axios';
import { logger } from './logger.js';

const PING_INTERVAL = 14 * 60 * 1000; // 14 min — por debajo del umbral de sleep de Render (15 min)

export function startHealthServer() {
  const port   = process.env.PORT ?? 3000;
  const appUrl = process.env.RENDER_EXTERNAL_URL; // Render lo inyecta automáticamente
  const app    = express();

  app.get('/health', (_, res) => res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
  }));

  app.get('/', (_, res) => res.json({ name: 'Jarvis-FavBot', status: 'online' }));

  app.listen(port, () => {
    logger.info(`Health server en puerto ${port}`);

    if (appUrl) {
      // Auto-ping para evitar que Render apague el servicio por inactividad
      setInterval(() => {
        axios.get(`${appUrl}/health`).catch(() => {});
      }, PING_INTERVAL);
      logger.info(`Auto-ping activo → ${appUrl}/health cada 14 min`);
    }
  });
}
