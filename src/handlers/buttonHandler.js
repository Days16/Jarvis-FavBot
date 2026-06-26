import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed, successEmbed } from '../utils/embedBuilder.js';

function isTicketStaff(member, cfg) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    logger.info(`[isTicketStaff] ${member.user.tag} → PASS (Administrator)`);
    return true;
  }
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    logger.info(`[isTicketStaff] ${member.user.tag} → PASS (ManageGuild)`);
    return true;
  }
  if (cfg?.staffRoleId && member.roles.cache.has(cfg.staffRoleId)) {
    logger.info(`[isTicketStaff] ${member.user.tag} → PASS (staffRole)`);
    return true;
  }
  logger.info(`[isTicketStaff] ${member.user.tag} → DENY | staffRoleId=${cfg?.staffRoleId} | roles=[${[...member.roles.cache.keys()].join(',')}]`);
  return false;
}

// ── Ticket buttons ──────────────────────────────────────────
async function handleTicketButton(interaction, parts) {
  const action = parts[1]; // claim | unclaim | close | rate | escalate

  if (action === 'claim') {
    const { getTicketByChannel, claimTicket } = await import('../models/Ticket.js');
    const { getTicketConfig } = await import('../models/GuildTicketConfig.js');
    const { buildTicketButtons } = await import('../utils/ticketManager.js');

    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [errorEmbed('No es un canal de ticket activo.')], flags: 64 });
    if (ticket.claimedBy) return interaction.reply({ embeds: [errorEmbed(`Ya fue reclamado por <@${ticket.claimedBy}>.`)], flags: 64 });
    if (ticket.creatorId === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('No puedes reclamar tu propio ticket.')], flags: 64 });

    const cfg = await getTicketConfig(interaction.guild.id);
    if (!isTicketStaff(interaction.member, cfg)) {
      return interaction.reply({ embeds: [errorEmbed('Solo el staff puede reclamar tickets.')], flags: 64 });
    }

    await claimTicket(interaction.channel.id, interaction.user.id);

    // Actualizar botones del mensaje del panel para mostrar "Liberar"
    await interaction.message.edit({ components: [buildTicketButtons(true)] }).catch(() => {});

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✋ **${interaction.user.tag}** ha reclamado este ticket.`)],
    });
    return;
  }

  if (action === 'unclaim') {
    const { getTicketByChannel, unclaimTicket } = await import('../models/Ticket.js');
    const { getTicketConfig } = await import('../models/GuildTicketConfig.js');
    const { buildTicketButtons } = await import('../utils/ticketManager.js');

    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [errorEmbed('No es un canal de ticket activo.')], flags: 64 });

    const cfg = await getTicketConfig(interaction.guild.id);
    if (!isTicketStaff(interaction.member, cfg)) {
      return interaction.reply({ embeds: [errorEmbed('Solo el staff puede liberar tickets.')], flags: 64 });
    }

    await unclaimTicket(interaction.channel.id);

    await interaction.message.edit({ components: [buildTicketButtons(false)] }).catch(() => {});

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription(`🔓 **${interaction.user.tag}** ha liberado este ticket. Queda sin reclamar.`)],
    });
    return;
  }

  if (action === 'escalate') {
    const { getTicketByChannel } = await import('../models/Ticket.js');
    const { getTicketConfig } = await import('../models/GuildTicketConfig.js');

    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [errorEmbed('No es un canal de ticket activo.')], flags: 64 });

    const cfg = await getTicketConfig(interaction.guild.id);
    if (!isTicketStaff(interaction.member, cfg)) {
      return interaction.reply({ embeds: [errorEmbed('Solo el staff puede escalar tickets.')], flags: 64 });
    }

    // Determinar rol superior a mencionar
    const escalationRoleId = cfg?.escalationRoleId;
    const pingContent = escalationRoleId
      ? `<@&${escalationRoleId}>`
      : (cfg?.staffRoleId ? `<@&${cfg.staffRoleId}>` : '@here');

    await interaction.reply({
      content: `${pingContent} ⬆️ **Escalada** por ${interaction.user}`,
      embeds: [new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('⬆️ Ticket escalado')
        .setDescription(`**${interaction.user.tag}** ha escalado este ticket a un superior.\nSe requiere atención prioritaria.`)
        .addFields({ name: 'Ticket', value: `#${String(ticket.ticketNum).padStart(4, '0')} — ${ticket.category}`, inline: true })
        .setTimestamp()],
    });
    return;
  }

  if (action === 'close') {
    const { getTicketConfig } = await import('../models/GuildTicketConfig.js');
    const { getTicketByChannel } = await import('../models/Ticket.js');
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) return interaction.reply({ embeds: [errorEmbed('No es un canal de ticket activo.')], flags: 64 });

    const cfg = await getTicketConfig(interaction.guild.id);
    if (!isTicketStaff(interaction.member, cfg)) {
      return interaction.reply({ embeds: [errorEmbed('Solo el staff puede cerrar tickets.')], flags: 64 });
    }

    const { closeTicketChannel } = await import('../utils/ticketManager.js');
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('🔒 Cerrando ticket…')] });
    await closeTicketChannel(interaction.channel, interaction.user);
    return;
  }

  if (action === 'rate') {
    const ticketId = parseInt(parts[2], 10);
    const stars = parseInt(parts[3], 10);
    const { rateTicket } = await import('../models/Ticket.js');
    await rateTicket(ticketId, stars);
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`${'⭐'.repeat(stars)} ¡Gracias por tu valoración!`)],
      components: [],
    });
    return;
  }
}

// ── Verify button ───────────────────────────────────────────
async function handleVerifyButton(interaction) {
  const { getGuildWelcome } = await import('../models/GuildWelcome.js');
  const cfg = await getGuildWelcome(interaction.guild.id);
  if (!cfg?.verifyRoleId) return interaction.reply({ embeds: [errorEmbed('La verificación no está configurada correctamente.')], flags: 64 });

  const role = interaction.guild.roles.cache.get(cfg.verifyRoleId);
  if (!role) return interaction.reply({ embeds: [errorEmbed('El rol de verificación no existe.')], flags: 64 });

  if (interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('✅ Ya estás verificado/a.')], flags: 64 });
  }

  await interaction.member.roles.add(role, 'Verificación por botón').catch(() => {});

  // Ocultar el canal de verificación al usuario recién verificado
  await interaction.channel.permissionOverwrites.create(interaction.user.id, { ViewChannel: false }).catch(() => {});

  await interaction.reply({ embeds: [successEmbed('✅ Verificado', `Se te ha asignado el rol ${role}. ¡Bienvenido/a al servidor!`)], flags: 64 });
}

// ── Role panel buttons ──────────────────────────────────────
async function handleRolePanelButton(interaction, parts) {
  // customId: rp:<panelId>:<roleId>
  const panelId = parseInt(parts[1], 10);
  const roleId = parts[2];

  const { getRolePanelById } = await import('../models/RolePanel.js');
  const panel = await getRolePanelById(panelId);
  if (!panel) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });

  if (panel.requireRole && !interaction.member.roles.cache.has(panel.requireRole)) {
    return interaction.reply({ embeds: [errorEmbed(`Necesitas el rol <@&${panel.requireRole}> para usar este panel.`)], flags: 64 });
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.reply({ embeds: [errorEmbed('Rol no encontrado.')], flags: 64 });

  const hasMeRole = interaction.member.roles.cache.has(roleId);
  const { mode } = panel;

  if (mode === 'add_only' && hasMeRole) {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`Ya tienes el rol ${role}.`)], flags: 64 });
  }
  if (mode === 'remove_only' && !hasMeRole) {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`No tienes el rol ${role}.`)], flags: 64 });
  }

  if (mode === 'exclusive') {
    const panelRoleIds = panel.entries.map(e => e.role_id);
    const toRemove = panelRoleIds.filter(id => id !== roleId && interaction.member.roles.cache.has(id));
    if (toRemove.length) await interaction.member.roles.remove(toRemove).catch(() => {});
  }

  if (hasMeRole && mode !== 'add_only') {
    await interaction.member.roles.remove(role).catch(() => {});
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`❌ Se te ha quitado el rol ${role}.`)], flags: 64 });
  } else {
    await interaction.member.roles.add(role).catch(() => {});
    return interaction.reply({ embeds: [successEmbed('Rol asignado', `✅ Se te ha asignado el rol ${role}.`)], flags: 64 });
  }
}

// ── Ticket category button (panel con pocos botones) ────────
async function handleTicketCategoryButton(interaction, parts) {
  // customId: ticket_cat_btn:<category>
  const category = parts[1];
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
  const { getTicketConfig } = await import('../models/GuildTicketConfig.js');

  const config = await getTicketConfig(interaction.guild.id);
  const catDef = config?.categories?.find(c => c.id === category);

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal:${category}`)
    .setTitle(`Ticket — ${catDef?.label ?? category}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Describe tu problema o consulta')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
}

// ── Giveaway buttons ────────────────────────────────────────
async function handleGiveawayButton(interaction, parts) {
  // customId: giveaway:enter:<id>
  const giveawayId = parseInt(parts[2], 10);
  const { toggleParticipant, getGiveaway } = await import('../models/Giveaway.js');
  const { buildGiveawayEmbed, buildGiveawayRow } = await import('../utils/giveawayManager.js');

  const giveaway = await getGiveaway(giveawayId);
  if (!giveaway) return interaction.reply({ embeds: [errorEmbed('Sorteo no encontrado.')], flags: 64 });
  if (giveaway.ended) return interaction.reply({ embeds: [errorEmbed('Este sorteo ya ha terminado.')], flags: 64 });

  const result = await toggleParticipant(giveawayId, interaction.user.id);
  if (!result) return interaction.reply({ embeds: [errorEmbed('Error al procesar la participación.')], flags: 64 });

  const updated = await getGiveaway(giveawayId);
  await interaction.message.edit({
    embeds: [buildGiveawayEmbed(updated)],
    components: [buildGiveawayRow(giveawayId)],
  }).catch(() => {});

  const msg = result.joined
    ? `🎉 ¡Estás participando en el sorteo! (${result.count} participantes)`
    : `😔 Has salido del sorteo. (${result.count} participantes)`;

  return interaction.reply({ embeds: [new EmbedBuilder().setColor(result.joined ? 0x57f287 : 0xfee75c).setDescription(msg)], flags: 64 });
}

// ── Main dispatcher ─────────────────────────────────────────
export async function handleButton(interaction) {
  const id = interaction.customId;
  const parts = id.split(':');

  try {
    if (parts[0] === 'ticket') return await handleTicketButton(interaction, parts);
    if (parts[0] === 'ticket_cat_btn') return await handleTicketCategoryButton(interaction, parts);
    if (id === 'verify') return await handleVerifyButton(interaction);
    if (parts[0] === 'rp') return await handleRolePanelButton(interaction, parts);
    if (parts[0] === 'giveaway') return await handleGiveawayButton(interaction, parts);
  } catch (e) {
    logger.error(`Error en botón ${id}:`, e);
    const payload = { embeds: [errorEmbed('Error procesando la acción.')], flags: 64 };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}
