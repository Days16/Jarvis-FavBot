import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { incrementTicketCount, getTicketConfig } from '../models/GuildTicketConfig.js';
import { createTicket, closeTicket, getTicketByChannel } from '../models/Ticket.js';
import { generateTranscript } from './transcriptGenerator.js';
import { logger } from './logger.js';

export async function openTicket(guild, user, category, reason, config) {
  const ticketNum = await incrementTicketCount(guild.id);
  const padded = String(ticketNum).padStart(4, '0');
  const channelName = `ticket-${padded}`;

  const permOverwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: guild.members.me, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];

  if (config.staffRoleId) {
    permOverwrites.push({
      id: config.staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
    });
  }

  const isSnowflake = id => /^\d{17,20}$/.test(id ?? '');
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: isSnowflake(config.categoryId) ? config.categoryId : null,
    permissionOverwrites: permOverwrites,
    topic: `Ticket de ${user.tag} | Categoría: ${category}`,
  });

  await createTicket({ ticketNum, guildId: guild.id, channelId: channel.id, creatorId: user.id, category, reason });

  const catLabel = config.categories?.find(c => c.id === category)?.label ?? category;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎫 Ticket #${padded} — ${catLabel}`)
    .setDescription(reason ? `**Descripción:**\n${reason}` : 'El staff estará contigo en breve.')
    .addFields(
      { name: 'Usuario', value: `${user}`, inline: true },
      { name: 'Categoría', value: catLabel, inline: true },
    )
    .setFooter({ text: 'Usa los botones para gestionar este ticket.' })
    .setTimestamp();

  const row = buildTicketButtons(false);

  const pingContent = config.staffRoleId ? `<@&${config.staffRoleId}> — nuevo ticket de ${user}` : `Nuevo ticket de ${user}`;
  await channel.send({ content: pingContent, embeds: [embed], components: [row] });

  return channel;
}

export async function closeTicketChannel(channel, closedBy) {
  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) return null;

  const closed = await closeTicket(channel.id, closedBy?.id ?? null);

  let transcriptHtml;
  try {
    transcriptHtml = await generateTranscript(channel, ticket);
  } catch (e) {
    logger.error('Error generando transcripción:', e);
  }

  const config = await getTicketConfig(channel.guild.id);
  const attachment = transcriptHtml
    ? new AttachmentBuilder(Buffer.from(transcriptHtml, 'utf-8'), { name: `transcript-${String(ticket.ticketNum).padStart(4, '0')}.html` })
    : null;

  // DM al creador con transcript + botones de rating
  const guild = channel.guild;
  const creator = await guild.members.fetch(ticket.creatorId).catch(() => null);
  if (creator && transcriptHtml) {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📋 Transcripción — Ticket #${String(ticket.ticketNum).padStart(4, '0')}`)
      .setDescription(`Tu ticket en **${guild.name}** ha sido cerrado.\nAdjunto encontrarás la transcripción.`)
      .setTimestamp();

    const ratingRow = new ActionRowBuilder().addComponents(
      ...[1, 2, 3, 4, 5].map(n =>
        new ButtonBuilder()
          .setCustomId(`ticket:rate:${closed.id}:${n}`)
          .setLabel('⭐'.repeat(n))
          .setStyle(ButtonStyle.Secondary)
      ),
    );

    try {
      await creator.send({
        embeds: [dmEmbed],
        files: attachment ? [attachment] : [],
        components: [ratingRow],
      });
    } catch { /* DMs cerrados */ }
  }

  // Log en canal de transcripciones
  if (config?.logChannelId) {
    const logCh = guild.channels.cache.get(config.logChannelId);
    if (logCh?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🔒 Ticket cerrado #${String(ticket.ticketNum).padStart(4, '0')}`)
        .addFields(
          { name: 'Creador', value: `<@${ticket.creatorId}>`, inline: true },
          { name: 'Cerrado por', value: closedBy ? `<@${closedBy.id}>` : 'Sistema', inline: true },
          { name: 'Categoría', value: ticket.category, inline: true },
        )
        .setTimestamp();
      await logCh.send({ embeds: [logEmbed], files: attachment ? [attachment] : [] }).catch(() => {});
    }
  }

  await channel.delete().catch(() => {});
  return closed;
}

export function buildTicketButtons(claimed) {
  const row = new ActionRowBuilder();
  if (!claimed) {
    row.addComponents(
      new ButtonBuilder().setCustomId('ticket:claim').setLabel('Reclamar').setStyle(ButtonStyle.Primary).setEmoji('✋'),
      new ButtonBuilder().setCustomId('ticket:escalate').setLabel('Escalar').setStyle(ButtonStyle.Secondary).setEmoji('⬆️'),
      new ButtonBuilder().setCustomId('ticket:close').setLabel('Cerrar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId('ticket:unclaim').setLabel('Liberar').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
      new ButtonBuilder().setCustomId('ticket:escalate').setLabel('Escalar').setStyle(ButtonStyle.Secondary).setEmoji('⬆️'),
      new ButtonBuilder().setCustomId('ticket:close').setLabel('Cerrar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    );
  }
  return row;
}
