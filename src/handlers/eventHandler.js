import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { join, dirname } from 'path';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  const files = readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  let count = 0;

  for (const file of files) {
    const { default: event } = await import(pathToFileURL(join(eventsPath, file)).href);
    if (!event?.name || !event?.execute) {
      logger.warn(`Evento inválido: ${file}`);
      continue;
    }
    const handler = (...args) => event.execute(...args, client);
    event.once ? client.once(event.name, handler) : client.on(event.name, handler);
    count++;
  }

  logger.success(`${count} eventos cargados`);
}
