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
      const lavaHost = process.env.LAVALINK_HOST;
      const lavaSecure = (process.env.LAVALINK_SECURE || 'false') === 'true';

      setInterval(() => {
        axios.get(`${appUrl}/health`).catch(() => {});
        // Mantener despierto el servicio Lavalink en Render
        if (lavaHost) {
          const proto = lavaSecure ? 'https' : 'http';
          const port  = process.env.LAVALINK_PORT || '2333';
          axios.get(`${proto}://${lavaHost}:${port}/version`).catch(() => {});
        }
      }, PING_INTERVAL);
      logger.info(`Auto-ping activo → ${appUrl}/health cada 14 min`);
    }
  });
}
