import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getGiveaway, updateGiveaway } from '../models/Giveaway.js';
import { logger } from './logger.js';

export function buildGiveawayEmbed(giveaway) {
  const ts = Math.floor(new Date(giveaway.endAt).getTime() / 1000);

  return new EmbedBuilder()
    .setColor(giveaway.ended ? 0x99aab5 : 0xffd700)
    .setTitle(`🎉 ${giveaway.prize}`)
    .setDescription([
      giveaway.description ? `${giveaway.description}\n` : null,
      giveaway.ended
        ? `**Ganadores:** ${giveaway.winnerIds.length ? giveaway.winnerIds.map(id => `<@${id}>`).join(', ') : 'Nadie participó'}`
        : `Termina <t:${ts}:R> • <t:${ts}:f>`,
    ].filter(Boolean).join('\n'))
    .addFields(
      { name: '🏆 Ganadores', value: String(giveaway.winnersCount), inline: true },
      { name: '🎟️ Participantes', value: String(giveaway.participants.length), inline: true },
      { name: '👤 Organiza', value: `<@${giveaway.hostId}>`, inline: true },
    )
    .setFooter({ text: giveaway.ended ? '🔒 Sorteo finalizado' : `ID: ${giveaway.id}` })
    .setTimestamp(new Date(giveaway.endAt));
}

export function buildGiveawayRow(giveawayId, ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:enter:${giveawayId}`)
      .setLabel(ended ? 'Finalizado' : '¡Participar! 🎉')
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(ended)
  );
}

export async function endGiveaway(client, giveaway) {
  const participants = [...giveaway.participants];
  const winnerIds = [];

  if (participants.length > 0) {
    const count = Math.min(giveaway.winnersCount, participants.length);
    const shuffled = participants.sort(() => Math.random() - 0.5);
    winnerIds.push(...shuffled.slice(0, count));
  }

  await updateGiveaway(giveaway.id, { ended: true, winnerIds });
  const updated = await getGiveaway(giveaway.id);

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (msg) {
      await msg.edit({
        embeds: [buildGiveawayEmbed(updated)],
        components: [buildGiveawayRow(giveaway.id, true)],
      }).catch(() => {});
    }

    const content = winnerIds.length
      ? `🎉 ¡Felicidades ${winnerIds.map(id => `<@${id}>`).join(', ')}! Han ganado **${giveaway.prize}**.`
      : `😔 No hubo participantes en el sorteo de **${giveaway.prize}**.`;

    await channel.send({ content }).catch(() => {});
  } catch (e) {
    logger.error('Error finalizando sorteo:', e);
  }
}
