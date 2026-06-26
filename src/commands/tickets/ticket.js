import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';

function isTicketStaff(member, cfg) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (cfg?.staffRoleId && member.roles.cache.has(cfg.staffRoleId)) return true;
  return false;
}
import { ensureTicketConfig, getTicketConfig, updateTicketConfig } from '../../models/GuildTicketConfig.js';
import { getOpenTickets, getTicketByChannel, claimTicket, unclaimTicket, getTicketStats } from '../../models/Ticket.js';
import { closeTicketChannel, buildTicketButtons } from '../../utils/ticketManager.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestión del sistema de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // setup
    .addSubcommand(s => s.setName('setup').setDescription('Crea el panel de tickets en un canal')
      .addChannelOption(o => o.setName('canal').setDescription('Canal donde poner el panel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(o => o.setName('staff').setDescription('Rol de staff que gestiona los tickets'))
      .addChannelOption(o => o.setName('logs').setDescription('Canal de transcripciones').addChannelTypes(ChannelType.GuildText))
      .addChannelOption(o => o.setName('categoria').setDescription('Categoría de Discord donde crear los tickets').addChannelTypes(ChannelType.GuildCategory)))

    // category
    .addSubcommandGroup(g => g.setName('category').setDescription('Gestiona las categorías del panel')
      .addSubcommand(s => s.setName('add').setDescription('Añade una categoría')
        .addStringOption(o => o.setName('id').setDescription('ID interna (sin espacios)').setRequired(true))
        .addStringOption(o => o.setName('label').setDescription('Nombre visible').setRequired(true))
        .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(false)))
      .addSubcommand(s => s.setName('remove').setDescription('Elimina una categoría')
        .addStringOption(o => o.setName('id').setDescription('ID de la categoría').setRequired(true))))

    // claim/unclaim/close/add/remove/rename/list/stats
    .addSubcommand(s => s.setName('claim').setDescription('Reclama este ticket (solo staff)'))
    .addSubcommand(s => s.setName('unclaim').setDescription('Libera este ticket para que otro staff lo reclame'))
    .addSubcommand(s => s.setName('escalate').setDescription('Avisa a un superior sobre este ticket')
      .addStringOption(o => o.setName('motivo').setDescription('Motivo de la escalada').setRequired(false)))
    .addSubcommand(s => s.setName('close').setDescription('Cierra el ticket y genera la transcripción')
      .addStringOption(o => o.setName('razon').setDescription('Razón de cierre')))
    .addSubcommand(s => s.setName('add').setDescription('Añade un usuario al ticket')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a añadir').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Quita a un usuario del ticket')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a quitar').setRequired(true)))
    .addSubcommand(s => s.setName('rename').setDescription('Renombra el canal del ticket')
      .addStringOption(o => o.setName('nombre').setDescription('Nuevo nombre').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Lista los tickets abiertos'))
    .addSubcommand(s => s.setName('stats').setDescription('Estadísticas de tickets del mes')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);

    // ── setup ──────────────────────────────────────────────
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('canal');
      const staffRole = interaction.options.getRole('staff');
      const logChannel = interaction.options.getChannel('logs');
      const catChannel = interaction.options.getChannel('categoria');

      await ensureTicketConfig(interaction.guild.id);
      await updateTicketConfig(interaction.guild.id, {
        panelChannelId: channel.id,
        ...(staffRole ? { staffRoleId: staffRole.id } : {}),
        ...(logChannel ? { logChannelId: logChannel.id } : {}),
        ...(catChannel ? { categoryId: catChannel.id } : {}),
      });

      const cfg = await getTicketConfig(interaction.guild.id);
      const embed = buildPanelEmbed(cfg, interaction.guild.name);
      const components = buildPanelComponents(cfg);

      const msg = await channel.send({ embeds: [embed], components });
      await updateTicketConfig(interaction.guild.id, { panelMessageId: msg.id });

      return interaction.reply({ embeds: [successEmbed('Panel creado', `Panel de tickets enviado a ${channel}.`)], flags: 64 });
    }

    // ── category ───────────────────────────────────────────
    if (group === 'category') {
      const cfg = await ensureTicketConfig(interaction.guild.id);
      const cats = [...(cfg.categories ?? [])];

      if (sub === 'add') {
        const id = interaction.options.getString('id').toLowerCase().replace(/\s+/g, '_');
        const label = interaction.options.getString('label');
        const emoji = interaction.options.getString('emoji') ?? '🎫';
        if (cats.find(c => c.id === id)) return interaction.reply({ embeds: [errorEmbed('Ya existe una categoría con ese ID.')], flags: 64 });
        if (cats.length >= 25) return interaction.reply({ embeds: [errorEmbed('Máximo 25 categorías.')], flags: 64 });
        cats.push({ id, label, emoji });
        await updateTicketConfig(interaction.guild.id, { categories: cats });
        return interaction.reply({ embeds: [successEmbed('Categoría añadida', `**${emoji} ${label}** (id: \`${id}\`) añadida al panel.`)] });
      }

      if (sub === 'remove') {
        const id = interaction.options.getString('id');
        const idx = cats.findIndex(c => c.id === id);
        if (idx === -1) return interaction.reply({ embeds: [errorEmbed(`No existe la categoría \`${id}\`.`)], flags: 64 });
        cats.splice(idx, 1);
        await updateTicketConfig(interaction.guild.id, { categories: cats });
        return interaction.reply({ embeds: [successEmbed('Categoría eliminada', `Categoría \`${id}\` eliminada.`)] });
      }
    }

    // ── claim ──────────────────────────────────────────────
    if (sub === 'claim') {
      const cfg = await getTicketConfig(interaction.guild.id);
      if (!isTicketStaff(interaction.member, cfg)) {
        return interaction.reply({ embeds: [errorEmbed('Solo el staff puede reclamar tickets.')], flags: 64 });
      }
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket activo.')], flags: 64 });
      if (ticket.claimedBy) return interaction.reply({ embeds: [errorEmbed(`Ya fue reclamado por <@${ticket.claimedBy}>.`)], flags: 64 });
      if (ticket.creatorId === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('No puedes reclamar tu propio ticket.')], flags: 64 });
      await claimTicket(interaction.channel.id, interaction.user.id);
      // Actualizar botones del panel
      const msgs = await interaction.channel.messages.fetch({ limit: 10 });
      const panelMsg = msgs.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
      if (panelMsg) await panelMsg.edit({ components: [buildTicketButtons(true)] }).catch(() => {});
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✋ **${interaction.user.tag}** ha reclamado este ticket.`)] });
    }

    // ── unclaim ────────────────────────────────────────────
    if (sub === 'unclaim') {
      const cfg = await getTicketConfig(interaction.guild.id);
      if (!isTicketStaff(interaction.member, cfg)) {
        return interaction.reply({ embeds: [errorEmbed('Solo el staff puede liberar tickets.')], flags: 64 });
      }
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket activo.')], flags: 64 });
      if (!ticket.claimedBy) return interaction.reply({ embeds: [errorEmbed('Este ticket no está reclamado.')], flags: 64 });
      await unclaimTicket(interaction.channel.id);
      const msgs = await interaction.channel.messages.fetch({ limit: 10 });
      const panelMsg = msgs.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
      if (panelMsg) await panelMsg.edit({ components: [buildTicketButtons(false)] }).catch(() => {});
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`🔓 **${interaction.user.tag}** ha liberado el ticket. Queda sin reclamar.`)] });
    }

    // ── escalate ───────────────────────────────────────────
    if (sub === 'escalate') {
      const cfg = await getTicketConfig(interaction.guild.id);
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket activo.')], flags: 64 });

      const motivo = interaction.options.getString('motivo') ?? 'Sin motivo especificado.';
      const escalationRoleId = cfg?.escalationRoleId;
      const pingContent = escalationRoleId
        ? `<@&${escalationRoleId}>`
        : (cfg?.staffRoleId ? `<@&${cfg.staffRoleId}>` : '@here');

      return interaction.reply({
        content: `${pingContent} ⬆️ Escalada por ${interaction.user}`,
        embeds: [new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('⬆️ Ticket escalado')
          .setDescription(`**${interaction.user.tag}** solicita atención de un superior.\n\n**Motivo:** ${motivo}`)
          .addFields({ name: 'Ticket', value: `#${String(ticket.ticketNum).padStart(4, '0')} — ${ticket.category}`, inline: true })
          .setTimestamp()],
      });
    }

    // ── close ──────────────────────────────────────────────
    if (sub === 'close') {
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket activo.')], flags: 64 });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('🔒 Cerrando ticket y generando transcripción…')] });
      await closeTicketChannel(interaction.channel, interaction.user);
      return;
    }

    // ── add ────────────────────────────────────────────────
    if (sub === 'add') {
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket.')], flags: 64 });
      const member = interaction.options.getMember('usuario');
      if (!member) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
      await interaction.channel.permissionOverwrites.create(member, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      return interaction.reply({ embeds: [successEmbed('Usuario añadido', `${member} puede ver este ticket ahora.`)] });
    }

    // ── remove ─────────────────────────────────────────────
    if (sub === 'remove') {
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket.')], flags: 64 });
      const member = interaction.options.getMember('usuario');
      if (!member) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
      await interaction.channel.permissionOverwrites.delete(member);
      return interaction.reply({ embeds: [successEmbed('Usuario quitado', `${member} fue eliminado del ticket.`)] });
    }

    // ── rename ─────────────────────────────────────────────
    if (sub === 'rename') {
      const ticket = await getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Esto no es un canal de ticket.')], flags: 64 });
      const nombre = interaction.options.getString('nombre').toLowerCase().replace(/\s+/g, '-');
      await interaction.channel.setName(nombre);
      return interaction.reply({ embeds: [successEmbed('Renombrado', `Canal renombrado a **${nombre}**.`)] });
    }

    // ── list ───────────────────────────────────────────────
    if (sub === 'list') {
      const tickets = await getOpenTickets(interaction.guild.id);
      if (!tickets.length) return interaction.reply({ embeds: [infoEmbed('Sin tickets abiertos', 'No hay tickets abiertos en este momento.')], flags: 64 });
      const desc = tickets.map(t =>
        `**#${String(t.ticketNum).padStart(4, '0')}** — <@${t.creatorId}> — ${t.category}${t.claimedBy ? ` — reclamado por <@${t.claimedBy}>` : ''} — <#${t.channelId}>`
      ).join('\n');
      return interaction.reply({ embeds: [infoEmbed(`Tickets abiertos (${tickets.length})`, desc)], flags: 64 });
    }

    // ── stats ──────────────────────────────────────────────
    if (sub === 'stats') {
      const stats = await getTicketStats(interaction.guild.id);
      const avgClose = stats.avgCloseMs ? formatMs(stats.avgCloseMs) : 'N/A';
      let staffLines = Object.entries(stats.staffStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id, s], i) => {
          const avg = s.ratingCount ? (s.totalRating / s.ratingCount).toFixed(1) : 'N/A';
          return `${i + 1}. <@${id}> — ${s.count} tickets — ${avg}⭐`;
        }).join('\n') || 'Sin datos';

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📊 Estadísticas de tickets — ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`)
        .addFields(
          { name: 'Tickets este mes', value: String(stats.total), inline: true },
          { name: 'Tiempo medio cierre', value: avgClose, inline: true },
          { name: 'Rating promedio', value: stats.avgRating ? `${stats.avgRating} ⭐` : 'N/A', inline: true },
          { name: 'Top staff', value: staffLines },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  },
};

function buildPanelEmbed(cfg, serverName) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Sistema de Soporte')
    .setDescription(`Selecciona la categoría de tu problema en el menú de abajo.\nUn miembro del staff te atenderá en breve.`)
    .setFooter({ text: serverName })
    .setTimestamp();
}

function buildPanelComponents(cfg) {
  const cats = cfg.categories ?? [];
  if (!cats.length) return [];

  if (cats.length <= 5) {
    const row = new ActionRowBuilder().addComponents(
      cats.map(c => new ButtonBuilder()
        .setCustomId(`ticket_cat_btn:${c.id}`)
        .setLabel(c.label)
        .setEmoji(c.emoji ?? '🎫')
        .setStyle(ButtonStyle.Primary))
    );
    return [row];
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_cat:open')
    .setPlaceholder('Selecciona una categoría…')
    .addOptions(cats.map(c => ({ label: c.label, value: c.id, emoji: c.emoji ?? '🎫', description: c.description ?? null })));
  return [new ActionRowBuilder().addComponents(select)];
}

function formatMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}min` : `${m}min`;
}
