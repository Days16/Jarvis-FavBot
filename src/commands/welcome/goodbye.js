import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed, infoEmbed } from '../../utils/embedBuilder.js';
import { ensureGuildWelcome, getGuildWelcome, updateGuildWelcome } from '../../models/GuildWelcome.js';
import { applyVariables } from '../../utils/welcomeVariables.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configura el mensaje de despedida')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('channel').setDescription('Canal de despedida')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('message').setDescription('Mensaje de despedida')
      .addStringOption(o => o.setName('texto').setDescription('Variables: {username} {server} {membercount}').setRequired(true)))
    .addSubcommand(s => s.setName('test').setDescription('Simula una despedida contigo'))
    .addSubcommand(s => s.setName('status').setDescription('Ver la configuración actual')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('canal');
      await ensureGuildWelcome(interaction.guild.id);
      await updateGuildWelcome(interaction.guild.id, { goodbyeChannelId: channel.id });
      return interaction.reply({ embeds: [successEmbed('Canal configurado', `Los mensajes de salida se enviarán en ${channel}.`)] });
    }

    if (sub === 'message') {
      const texto = interaction.options.getString('texto');
      await ensureGuildWelcome(interaction.guild.id);
      await updateGuildWelcome(interaction.guild.id, { goodbyeMessage: texto });
      return interaction.reply({ embeds: [successEmbed('Mensaje guardado', `**Preview:**\n${texto}`)] });
    }

    if (sub === 'test') {
      const cfg = await getGuildWelcome(interaction.guild.id);
      const text = applyVariables(cfg?.goodbyeMessage ?? '👋 {username} ha abandonado el servidor.', interaction.member);
      return interaction.reply({ content: text, flags: 64 });
    }

    if (sub === 'status') {
      const cfg = await getGuildWelcome(interaction.guild.id);
      const lines = [
        `**Canal:** ${cfg?.goodbyeChannelId ? `<#${cfg.goodbyeChannelId}>` : '❌ no configurado'}`,
        `**Mensaje:** ${cfg?.goodbyeMessage ?? 'por defecto'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed('Configuración de despedidas', lines.join('\n'))], flags: 64 });
    }
  },
};
