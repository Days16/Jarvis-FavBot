import schedule from 'node-schedule';
import { logger } from './logger.js';
import { supabase } from './database.js';
import { initPoller, pollTwitch, pollYouTube, pollRSS, pollReddit, pollGitHub } from './integrationPoller.js';

let client;

export function initScheduler(discordClient) {
  client = discordClient;
  initPoller(client);

  // Cada hora: tickets sin actividad + canales privados inactivos
  schedule.scheduleJob('0 * * * *', async () => {
    await checkAutoClose();
    await checkInactivePrivateChannels();
  });

  // Cada minuto: sorteos expirados
  schedule.scheduleJob('* * * * *', async () => {
    await checkExpiredGiveaways();
  });

  // Cada 5 min: Twitch live
  schedule.scheduleJob('*/5 * * * *', () => {
    pollTwitch().catch(e => logger.error('[Scheduler/Twitch]', e.message));
  });

  // Cada 15 min: YouTube RSS
  schedule.scheduleJob('*/15 * * * *', () => {
    pollYouTube().catch(e => logger.error('[Scheduler/YouTube]', e.message));
  });

  // Cada 30 min: RSS, Reddit, GitHub
  schedule.scheduleJob('*/30 * * * *', () => {
    Promise.allSettled([
      pollRSS().catch(e => logger.error('[Scheduler/RSS]', e.message)),
      pollReddit().catch(e => logger.error('[Scheduler/Reddit]', e.message)),
      pollGitHub().catch(e => logger.error('[Scheduler/GitHub]', e.message)),
    ]);
  });

  logger.info('Scheduler iniciado.');
}

async function checkAutoClose() {
  const { data: configs } = await supabase
    .from('guild_ticket_config')
    .select('guild_id, autoclose_hours')
    .gt('autoclose_hours', 0);

  if (!configs?.length) return;

  for (const cfg of configs) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - cfg.autoclose_hours);

    const { data: oldTickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('guild_id', cfg.guild_id)
      .eq('status', 'open')
      .lt('opened_at', cutoff.toISOString());

    if (!oldTickets?.length) continue;

    const guild = client.guilds.cache.get(cfg.guild_id);
    if (!guild) continue;

    for (const ticket of oldTickets) {
      const channel = guild.channels.cache.get(ticket.channel_id);
      if (!channel) continue;

      const lastMsg = await channel.messages.fetch({ limit: 1 }).catch(() => null);
      const lastTs = lastMsg?.first()?.createdTimestamp ?? new Date(ticket.opened_at).getTime();

      if (Date.now() - lastTs < cfg.autoclose_hours * 3600 * 1000) continue;

      await channel.send('⏰ Este ticket no ha tenido actividad. Cerrando automáticamente…').catch(() => {});

      const { closeTicketChannel } = await import('./ticketManager.js');
      await closeTicketChannel(channel, null).catch(e => logger.error('Auto-close error:', e));
    }
  }
}

async function checkExpiredGiveaways() {
  const { getExpiredGiveaways } = await import('../models/Giveaway.js');
  const { endGiveaway } = await import('./giveawayManager.js');

  const expired = await getExpiredGiveaways();
  for (const giveaway of expired) {
    await endGiveaway(client, giveaway).catch(e => logger.error('Error en sorteo:', e));
  }
}

async function checkInactivePrivateChannels() {
  const { data: channels } = await supabase
    .from('private_channels')
    .select('*')
    .lt('last_active', new Date(Date.now() - 5 * 86400000).toISOString()); // 5 días

  if (!channels?.length) return;

  for (const pc of channels) {
    const guild = client.guilds.cache.get(pc.guild_id);
    if (!guild) continue;

    const warned5days = pc.last_active && (Date.now() - new Date(pc.last_active).getTime()) >= 5 * 86400000;
    const warned7days = pc.last_active && (Date.now() - new Date(pc.last_active).getTime()) >= 7 * 86400000;

    const channel = guild.channels.cache.get(pc.channel_id);

    if (warned7days) {
      if (channel) await channel.delete('Inactividad de 7 días').catch(() => {});
      await supabase.from('private_channels').delete().eq('channel_id', pc.channel_id);
    } else if (warned5days) {
      const owner = await guild.members.fetch(pc.owner_id).catch(() => null);
      if (owner) {
        await owner.send(`⚠️ Tu canal privado **#${pc.name}** en **${guild.name}** lleva 5 días sin actividad. Se eliminará en 2 días si no hay mensajes.`).catch(() => {});
      }
    }
  }
}
