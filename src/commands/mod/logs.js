import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed, COLORS } from '../../utils/embedBuilder.js';
import { ensureGuildLogs, updateGuildLogs } from '../../models/GuildLogs.js';

const LOG_TYPES = ['messages', 'members', 'mod', 'roles', 'channels', 'voice', 'invites', 'guild', 'bot'];
const LOG_LABELS = {
  messages: 'Mensajes', members: 'Miembros', mod: 'Moderación', roles: 'Roles',
  channels: 'Canales', voice: 'Voz', invites: 'Invitaciones', guild: 'Servidor', bot: 'Bot',
};

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configura el sistema de logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('setup').setDescription('Configura el canal de logs de moderación')
        .addChannelOption(o => o.setName('canal').setDescription('Canal para los logs de mod').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('channel').setDescription('Asigna un canal a un tipo de log')
        .addStringOption(o =>
          o.setName('tipo').setDescription('Tipo de log').setRequired(true)
            .addChoices(...LOG_TYPES.map(t => ({ name: LOG_LABELS[t], value: t })))
        )
        .addChannelOption(o => o.setName('canal').setDescription('Canal para este log').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Activa un tipo de log')
        .addStringOption(o =>
          o.setName('tipo').setDescription('Tipo de log').setRequired(true)
            .addChoices(...LOG_TYPES.map(t => ({ name: LOG_LABELS[t], value: t })))
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Desactiva un tipo de log')
        .addStringOption(o =>
          o.setName('tipo').setDescription('Tipo de log').setRequired(true)
            .addChoices(...LOG_TYPES.map(t => ({ name: LOG_LABELS[t], value: t })))
        )
    )
    .addSubcommand(sub => sub.setName('status').setDescription('Muestra el estado de todos los logs'))
    .addSubcommand(sub => sub.setName('test').setDescription('Envía un embed de prueba al canal de moderación')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    let logsData = await ensureGuildLogs(interaction.guild.id);

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('canal');
      const channels = { ...logsData.channels, mod: channel.id };
      const enabled  = { ...logsData.enabled,  mod: true };
      await updateGuildLogs(interaction.guild.id, { channels, enabled });
      return interaction.reply({ embeds: [successEmbed('Logs de moderación configurados', `Los logs de mod se enviarán a ${channel}.`)] });
    }

    if (sub === 'channel') {
      const tipo    = interaction.options.getString('tipo');
      const channel = interaction.options.getChannel('canal');
      const channels = { ...logsData.channels, [tipo]: channel.id };
      await updateGuildLogs(interaction.guild.id, { channels });
      return interaction.reply({ embeds: [successEmbed('Canal de log configurado', `**${LOG_LABELS[tipo]}** → ${channel}`)] });
    }

    if (sub === 'enable') {
      const tipo = interaction.options.getString('tipo');
      if (!logsData.channels[tipo]) return interaction.reply({ embeds: [errorEmbed(`Configura primero el canal con \`/logs channel\`.`)], flags: 64 });
      const enabled = { ...logsData.enabled, [tipo]: true };
      await updateGuildLogs(interaction.guild.id, { enabled });
      return interaction.reply({ embeds: [successEmbed('Log activado', `**${LOG_LABELS[tipo]}** está ahora activo.`)] });
    }

    if (sub === 'disable') {
      const tipo = interaction.options.getString('tipo');
      const enabled = { ...logsData.enabled, [tipo]: false };
      await updateGuildLogs(interaction.guild.id, { enabled });
      return interaction.reply({ embeds: [successEmbed('Log desactivado', `**${LOG_LABELS[tipo]}** fue desactivado.`)] });
    }

    if (sub === 'status') {
      const embed = new EmbedBuilder().setColor(COLORS.info).setTitle('📋 Estado de los logs').setTimestamp();
      for (const tipo of LOG_TYPES) {
        const ch      = logsData.channels[tipo] ? `<#${logsData.channels[tipo]}>` : 'Sin canal';
        const enabled = logsData.enabled[tipo] ? '✅' : '❌';
        embed.addFields({ name: `${enabled} ${LOG_LABELS[tipo]}`, value: ch, inline: true });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'test') {
      const channelId = logsData.channels.mod;
      if (!channelId) return interaction.reply({ embeds: [errorEmbed('Configura primero el canal con `/logs setup`.')], flags: 64 });
      const logChannel = interaction.guild.channels.cache.get(channelId);
      if (!logChannel) return interaction.reply({ embeds: [errorEmbed('El canal de logs ya no existe.')], flags: 64 });

      await logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🧪 Log de prueba')
          .setDescription('Sistema de logs de Jarvis-FavBot funcionando correctamente.')
          .addFields({ name: 'Generado por', value: `${interaction.user.tag}`, inline: true })
          .setTimestamp()],
      });
      return interaction.reply({ embeds: [successEmbed('Test enviado', `Embed de prueba enviado a ${logChannel}.`)], flags: 64 });
    }
  },
};
