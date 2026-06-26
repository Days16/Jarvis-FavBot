import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, AttachmentBuilder } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';
import { ensureGuildWelcome, getGuildWelcome, updateGuildWelcome } from '../../models/GuildWelcome.js';
import { generateWelcomeCard } from '../../utils/welcomeCard.js';
import { applyVariables } from '../../utils/welcomeVariables.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configura el sistema de bienvenidas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s.setName('channel').setDescription('Canal de bienvenidas')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('message').setDescription('Mensaje de bienvenida')
      .addStringOption(o => o.setName('texto').setDescription('Variables: {user} {username} {server} {membercount} {date}').setRequired(true)))
    .addSubcommandGroup(g => g.setName('image').setDescription('Imagen canvas')
      .addSubcommand(s => s.setName('toggle').setDescription('Activa/desactiva la imagen')
        .addStringOption(o => o.setName('estado').setDescription('on/off').setRequired(true).addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' })))
      .addSubcommand(s => s.setName('background').setDescription('URL de imagen de fondo')
        .addStringOption(o => o.setName('url').setDescription('URL de imagen').setRequired(true))))
    .addSubcommandGroup(g => g.setName('dm').setDescription('DM automático al nuevo miembro')
      .addSubcommand(s => s.setName('set').setDescription('Activa el DM con este mensaje')
        .addStringOption(o => o.setName('texto').setDescription('Mensaje de DM').setRequired(true)))
      .addSubcommand(s => s.setName('off').setDescription('Desactiva el DM')))
    .addSubcommand(s => s.setName('test').setDescription('Simula una bienvenida contigo'))
    .addSubcommand(s => s.setName('status').setDescription('Ver la configuración actual')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('canal');
      await ensureGuildWelcome(interaction.guild.id);
      await updateGuildWelcome(interaction.guild.id, { welcomeChannelId: channel.id });
      return interaction.reply({ embeds: [successEmbed('Canal configurado', `Las bienvenidas se enviarán en ${channel}.`)] });
    }

    if (sub === 'message') {
      const texto = interaction.options.getString('texto');
      await ensureGuildWelcome(interaction.guild.id);
      await updateGuildWelcome(interaction.guild.id, { welcomeMessage: texto });
      return interaction.reply({ embeds: [successEmbed('Mensaje guardado', `**Preview:**\n${texto}`)] });
    }

    if (group === 'image') {
      await ensureGuildWelcome(interaction.guild.id);
      if (sub === 'toggle') {
        const enabled = interaction.options.getString('estado') === 'on';
        await updateGuildWelcome(interaction.guild.id, { welcomeImageEnabled: enabled });
        return interaction.reply({ embeds: [successEmbed('Imagen canvas', `Imagen de bienvenida **${enabled ? 'activada' : 'desactivada'}**.`)] });
      }
      if (sub === 'background') {
        const url = interaction.options.getString('url');
        await updateGuildWelcome(interaction.guild.id, { welcomeBgUrl: url });
        return interaction.reply({ embeds: [successEmbed('Fondo actualizado', `Se usará la imagen de la URL proporcionada.`)] });
      }
    }

    if (group === 'dm') {
      await ensureGuildWelcome(interaction.guild.id);
      if (sub === 'set') {
        const texto = interaction.options.getString('texto');
        await updateGuildWelcome(interaction.guild.id, { welcomeDm: texto });
        return interaction.reply({ embeds: [successEmbed('DM configurado', `Los nuevos miembros recibirán un DM con ese mensaje.`)] });
      }
      if (sub === 'off') {
        await updateGuildWelcome(interaction.guild.id, { welcomeDm: null });
        return interaction.reply({ embeds: [successEmbed('DM desactivado', 'No se enviarán DMs de bienvenida.')] });
      }
    }

    if (sub === 'test') {
      await interaction.deferReply({ flags: 64 });
      const cfg = await getGuildWelcome(interaction.guild.id);
      const member = interaction.member;
      const count = interaction.guild.memberCount;
      const text = applyVariables(cfg?.welcomeMessage ?? '¡Bienvenido/a {user}!', member);
      const files = [];

      if (cfg?.welcomeImageEnabled !== false) {
        try {
          const buf = await generateWelcomeCard(member, count, cfg?.welcomeBgUrl);
          files.push(new AttachmentBuilder(buf, { name: 'welcome.png' }));
        } catch { /* canvas opcional */ }
      }

      return interaction.editReply({ content: text, files });
    }

    if (sub === 'status') {
      const cfg = await getGuildWelcome(interaction.guild.id);
      const lines = [
        `**Canal:** ${cfg?.welcomeChannelId ? `<#${cfg.welcomeChannelId}>` : '❌ no configurado'}`,
        `**Imagen:** ${cfg?.welcomeImageEnabled !== false ? '✅' : '❌'}`,
        `**DM:** ${cfg?.welcomeDm ? '✅' : '❌'}`,
        `**Mensaje:** ${cfg?.welcomeMessage ?? 'por defecto'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed('Configuración de bienvenidas', lines.join('\n'))], flags: 64 });
    }
  },
};
