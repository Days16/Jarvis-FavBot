import { ensureGuild } from '../models/Guild.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildCreate',
  async execute(guild) {
    await ensureGuild(guild.id)
      .catch(err => logger.error(`Error guardando guild ${guild.id}:`, err));
    logger.info(`Unido a: ${guild.name} (${guild.id}) — ${guild.memberCount} miembros`);
  },
};
