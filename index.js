import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { connectDatabase } from './src/utils/database.js';
import { loadCommands } from './src/handlers/commandHandler.js';
import { loadEvents } from './src/handlers/eventHandler.js';
import { logger } from './src/utils/logger.js';
import { initScheduler } from './src/utils/scheduler.js';
import { initMusic } from './src/utils/musicManager.js';
import { startHealthServer } from './src/utils/healthServer.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

client.commands  = new Collection();
client.cooldowns = new Collection();

process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
process.on('uncaughtException',  (err) => { logger.error('Uncaught exception:', err); process.exit(1); });

(async () => {
  await connectDatabase();
  await loadCommands(client);
  await loadEvents(client);
  await client.login(process.env.DISCORD_TOKEN);
  client.once('clientReady', () => {
    initMusic(client);
    initScheduler(client);
    startHealthServer();
  });
})();
