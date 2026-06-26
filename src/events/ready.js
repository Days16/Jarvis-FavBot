import { ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.success(`Conectado como ${client.user.tag}`);
    logger.info(`Servidores: ${client.guilds.cache.size} | Usuarios: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);

    const update = () => {
      client.user.setPresence({
        activities: [{ name: `/help | ${client.guilds.cache.size} servidores`, type: ActivityType.Watching }],
        status: 'online',
      });
    };
    update();
    setInterval(update, 30 * 60 * 1000);
  },
};
