import { readdirSync, statSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { join, dirname } from 'path';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  const commandsPath = join(__dirname, '..', 'commands');
  const categories = readdirSync(commandsPath).filter(
    f => statSync(join(commandsPath, f)).isDirectory()
  );
  let count = 0;

  for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    const files = readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const { default: command } = await import(pathToFileURL(join(categoryPath, file)).href);
      if (command?.data && command?.execute) {
        client.commands.set(command.data.name, command);
        count++;
      } else {
        logger.warn(`Comando inválido: ${category}/${file} (falta data o execute)`);
      }
    }
  }

  logger.success(`${count} comandos cargados`);
}
