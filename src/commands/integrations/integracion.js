import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embedBuilder.js';
import {
  INTEGRATION_LABELS,
  getGuildIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
} from '../../models/GuildIntegrations.js';

const EMOJI = {
  twitch: '🟣', youtube: '🔴', kick: '🟢', tiktok: '⚫',
  github: '⬛', rss: '🟠', reddit: '🟥', steam: '🔵',
};

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('integracion')
    .setDescription('Gestiona integraciones de notificaciones (Twitch, YouTube, RSS…)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ── Twitch ──────────────────────────────────────────────────────
    .addSubcommandGroup(g => g
      .setName('twitch').setDescription('Notificaciones de streams en vivo de Twitch')
      .addSubcommand(s => s
        .setName('agregar').setDescription('Añadir un streamer de Twitch')
        .addStringOption(o => o.setName('usuario').setDescription('Nombre de usuario en Twitch').setRequired(true))
        .addChannelOption(o => o.setName('canal').setDescription('Canal donde notificar').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar').setRequired(false))
        .addStringOption(o => o.setName('nombre').setDescription('Nombre descriptivo').setRequired(false)))
      .addSubcommand(s => s
        .setName('quitar').setDescription('Quitar integración de Twitch')
        .addIntegerOption(o => o.setName('id').setDescription('ID de la integración (/integracion lista)').setRequired(true))))

    // ── YouTube ─────────────────────────────────────────────────────
    .addSubcommandGroup(g => g
      .setName('youtube').setDescription('Notificaciones de nuevos vídeos de YouTube')
      .addSubcommand(s => s
        .setName('agregar').setDescription('Añadir un canal de YouTube')
        .addStringOption(o => o.setName('channel_id').setDescription('ID del canal (UCxxxxxxx)').setRequired(true))
        .addStringOption(o => o.setName('nombre').setDescription('Nombre del canal').setRequired(true))
        .addChannelOption(o => o.setName('canal').setDescription('Canal donde notificar').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar').setRequired(false)))
      .addSubcommand(s => s
        .setName('quitar').setDescription('Quitar integración de YouTube')
        .addIntegerOption(o => o.setName('id').setDescription('ID de la integración').setRequired(true))))

    // ── RSS ─────────────────────────────────────────────────────────
    .addSubcommandGroup(g => g
      .setName('rss').setDescription('Seguimiento de feeds RSS/Atom')
      .addSubcommand(s => s
        .setName('agregar').setDescription('Añadir un feed RSS')
        .addStringOption(o => o.setName('url').setDescription('URL del feed RSS').setRequired(true))
        .addStringOption(o => o.setName('nombre').setDescription('Nombre descriptivo').setRequired(true))
        .addChannelOption(o => o.setName('canal').setDescription('Canal donde notificar').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar').setRequired(false)))
      .addSubcommand(s => s
        .setName('quitar').setDescription('Quitar integración RSS')
        .addIntegerOption(o => o.setName('id').setDescription('ID de la integración').setRequired(true))))

    // ── Reddit ──────────────────────────────────────────────────────
    .addSubcommandGroup(g => g
      .setName('reddit').setDescription('Notificaciones de posts nuevos en Reddit')
      .addSubcommand(s => s
        .setName('agregar').setDescription('Añadir un subreddit')
        .addStringOption(o => o.setName('subreddit').setDescription('Nombre del subreddit (sin r/)').setRequired(true))
        .addChannelOption(o => o.setName('canal').setDescription('Canal donde notificar').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar').setRequired(false))
        .addStringOption(o => o.setName('nombre').setDescription('Nombre descriptivo').setRequired(false)))
      .addSubcommand(s => s
        .setName('quitar').setDescription('Quitar integración de Reddit')
        .addIntegerOption(o => o.setName('id').setDescription('ID de la integración').setRequired(true))))

    // ── GitHub ──────────────────────────────────────────────────────
    .addSubcommandGroup(g => g
      .setName('github').setDescription('Notificaciones de releases de GitHub')
      .addSubcommand(s => s
        .setName('agregar').setDescription('Añadir un repositorio de GitHub')
        .addStringOption(o => o.setName('repo').setDescription('Repositorio (formato owner/repo)').setRequired(true))
        .addChannelOption(o => o.setName('canal').setDescription('Canal donde notificar').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar').setRequired(false))
        .addStringOption(o => o.setName('nombre').setDescription('Nombre descriptivo').setRequired(false)))
      .addSubcommand(s => s
        .setName('quitar').setDescription('Quitar integración de GitHub')
        .addIntegerOption(o => o.setName('id').setDescription('ID de la integración').setRequired(true))))

    // ── Gestión global ──────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('lista').setDescription('Lista todas las integraciones activas del servidor'))
    .addSubcommand(s => s
      .setName('toggle')
      .setDescription('Activa o desactiva una integración sin eliminarla')
      .addIntegerOption(o => o.setName('id').setDescription('ID de la integración').setRequired(true))),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sub   = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    // ── lista ──────────────────────────────────────────────────────
    if (sub === 'lista') {
      const all = await getGuildIntegrations(interaction.guild.id);
      if (!all.length) {
        return interaction.editReply({ embeds: [errorEmbed('No hay integraciones configuradas. Usa `/integracion <tipo> agregar` para crear una.')] });
      }
      const lines = all.map(i =>
        `\`${String(i.id).padEnd(3)}\` ${EMOJI[i.type] ?? '🔗'} **${INTEGRATION_LABELS[i.type]}** — ${i.name} → <#${i.alertChannelId}> ${i.enabled ? '✅' : '❌'}`,
      );
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🔗 Integraciones del servidor')
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${all.length} integración${all.length !== 1 ? 'es' : ''} · ID para quitar/toggle` })],
      });
    }

    // ── toggle ─────────────────────────────────────────────────────
    if (sub === 'toggle') {
      const id  = interaction.options.getInteger('id');
      const all = await getGuildIntegrations(interaction.guild.id);
      const intg = all.find(i => i.id === id);
      if (!intg) return interaction.editReply({ embeds: [errorEmbed(`No se encontró la integración \`${id}\`.`)] });
      await updateIntegration(id, interaction.guild.id, { enabled: !intg.enabled });
      return interaction.editReply({
        embeds: [successEmbed('Integración actualizada', `**${intg.name}** ahora está ${!intg.enabled ? '✅ activada' : '❌ desactivada'}.`)],
      });
    }

    // ── quitar ─────────────────────────────────────────────────────
    if (sub === 'quitar') {
      const id = interaction.options.getInteger('id');
      const ok = await deleteIntegration(id, interaction.guild.id);
      if (!ok) return interaction.editReply({ embeds: [errorEmbed(`No se pudo eliminar la integración \`${id}\`.`)] });
      return interaction.editReply({ embeds: [successEmbed('Integración eliminada', `Integración \`${id}\` eliminada.`)] });
    }

    // ── agregar ────────────────────────────────────────────────────
    if (sub === 'agregar' && group) {
      const canal = interaction.options.getChannel('canal');
      const rol   = interaction.options.getRole('rol');
      let type, target, name;

      if (group === 'twitch') {
        target = interaction.options.getString('usuario').toLowerCase();
        name   = interaction.options.getString('nombre') ?? `Twitch: ${target}`;
        type   = 'twitch';
      } else if (group === 'youtube') {
        target = interaction.options.getString('channel_id');
        name   = interaction.options.getString('nombre');
        type   = 'youtube';
      } else if (group === 'rss') {
        target = interaction.options.getString('url');
        name   = interaction.options.getString('nombre');
        type   = 'rss';
      } else if (group === 'reddit') {
        target = interaction.options.getString('subreddit').replace(/^r\//i, '');
        name   = interaction.options.getString('nombre') ?? `r/${target}`;
        type   = 'reddit';
      } else if (group === 'github') {
        target = interaction.options.getString('repo');
        name   = interaction.options.getString('nombre') ?? `GitHub: ${target}`;
        type   = 'github';
      }

      if (!type) return interaction.editReply({ embeds: [errorEmbed('Tipo no reconocido.')] });

      const existing = await getGuildIntegrations(interaction.guild.id, type);
      if (existing.some(i => i.target.toLowerCase() === target.toLowerCase())) {
        return interaction.editReply({
          embeds: [errorEmbed(`Ya existe una integración de **${INTEGRATION_LABELS[type]}** para \`${target}\`.`)],
        });
      }

      const intg = await createIntegration(interaction.guild.id, {
        type, name, target,
        alertChannelId: canal.id,
        pingRoleId: rol?.id ?? null,
      });

      return interaction.editReply({
        embeds: [successEmbed(
          `${EMOJI[type] ?? '🔗'} Integración añadida`,
          `**${name}** configurada correctamente.\nNotificaciones → ${canal}${rol ? ` · Menciona ${rol}` : ''}\nID: \`${intg.id}\``,
        )],
      });
    }

    return interaction.editReply({ embeds: [errorEmbed('Subcomando no reconocido.')] });
  },
};
