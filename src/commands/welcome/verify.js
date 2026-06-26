import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';
import { ensureGuildWelcome, getGuildWelcome, updateGuildWelcome } from '../../models/GuildWelcome.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Sistema de verificación de miembros')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('setup').setDescription('Crea el panel de verificación en un canal')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de verificación').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('role').setDescription('Rol que se asigna al verificarse')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('message').setDescription('Mensaje del panel de verificación')
      .addStringOption(o => o.setName('texto').setDescription('Texto del embed').setRequired(true)))
    .addSubcommand(s => s.setName('lockdown').setDescription('Oculta TODOS los canales a no verificados y deja visible solo el canal de verificación'))
    .addSubcommand(s => s.setName('status').setDescription('Muestra la configuración actual de verificación')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'role') {
      const role = interaction.options.getRole('rol');
      await ensureGuildWelcome(interaction.guild.id);
      await updateGuildWelcome(interaction.guild.id, { verifyRoleId: role.id });
      return interaction.reply({ embeds: [successEmbed('Rol configurado', `${role} se asignará al verificarse.`)] });
    }

    if (sub === 'message') {
      const texto = interaction.options.getString('texto');
      await ensureGuildWelcome(interaction.guild.id);
      await updateGuildWelcome(interaction.guild.id, { verifyMessage: texto });
      return interaction.reply({ embeds: [successEmbed('Mensaje guardado', 'Usa `/verify setup` para publicar el panel actualizado.')] });
    }

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('canal');
      await ensureGuildWelcome(interaction.guild.id);
      const cfg = await getGuildWelcome(interaction.guild.id);

      if (!cfg?.verifyRoleId) {
        return interaction.reply({ embeds: [errorEmbed('Configura primero el rol con `/verify role @rol`.')], flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Verificación de miembro')
        .setDescription(cfg.verifyMessage ?? 'Para acceder al servidor pulsa el botón de abajo.\nAl verificarte aceptas las reglas de la comunidad.')
        .setFooter({ text: interaction.guild.name });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify')
          .setLabel('Verificarme')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
      );

      if (cfg.verifyPanelMsgId && cfg.verifyChannelId) {
        const oldCh = interaction.guild.channels.cache.get(cfg.verifyChannelId);
        if (oldCh) await oldCh.messages.delete(cfg.verifyPanelMsgId).catch(() => {});
      }

      const msg = await channel.send({ embeds: [embed], components: [row] });
      await updateGuildWelcome(interaction.guild.id, { verifyChannelId: channel.id, verifyPanelMsgId: msg.id });

      return interaction.reply({ embeds: [successEmbed('Panel creado', `Panel de verificación enviado a ${channel}.\n\nUsa \`/verify lockdown\` para que los nuevos miembros solo vean este canal.`)], flags: 64 });
    }

    if (sub === 'lockdown') {
      await interaction.deferReply({ flags: 64 });

      const cfg = await getGuildWelcome(interaction.guild.id);
      if (!cfg?.verifyChannelId) {
        return interaction.editReply({ embeds: [errorEmbed('Primero crea el panel con `/verify setup #canal`.')] });
      }
      if (!cfg?.verifyRoleId) {
        return interaction.editReply({ embeds: [errorEmbed('Primero configura el rol con `/verify role @rol`.')] });
      }

      const guild = interaction.guild;
      const everyone = guild.roles.everyone;
      const verifyChannel = guild.channels.cache.get(cfg.verifyChannelId);
      const verifyRole = guild.roles.cache.get(cfg.verifyRoleId);

      if (!verifyChannel) return interaction.editReply({ embeds: [errorEmbed('El canal de verificación ya no existe.')] });
      if (!verifyRole) return interaction.editReply({ embeds: [errorEmbed('El rol de verificación ya no existe.')] });

      let channelsUpdated = 0;
      const textChannels = guild.channels.cache.filter(c =>
        (c.isTextBased() || c.type === ChannelType.GuildCategory) && c.id !== verifyChannel.id
      );

      for (const [, ch] of textChannels) {
        // Ocultar a @everyone en todos los canales excepto el de verificación
        await ch.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => {});
        // El rol verificado puede ver todo
        await ch.permissionOverwrites.edit(verifyRole, { ViewChannel: true }).catch(() => {});
        channelsUpdated++;
      }

      // El canal de verificación: @everyone puede ver pero no escribir
      await verifyChannel.permissionOverwrites.edit(everyone, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
      }).catch(() => {});
      // El rol verificado no necesita ver el canal de verificación (opcional, pero limpio)
      await verifyChannel.permissionOverwrites.edit(verifyRole, {
        ViewChannel: false,
      }).catch(() => {});

      return interaction.editReply({
        embeds: [successEmbed(
          '🔒 Lockdown de verificación aplicado',
          `**${channelsUpdated}** canales configurados.\n\n` +
          `• **@everyone** solo ve ${verifyChannel}\n` +
          `• Al verificarse con ${verifyRole} acceden al resto del servidor\n\n` +
          `Para revertir, quita los overrides de \`@everyone\` y \`${verifyRole.name}\` manualmente en la configuración de Discord.`
        )],
      });
    }

    if (sub === 'status') {
      const cfg = await getGuildWelcome(interaction.guild.id);
      const lines = [
        `**Canal:** ${cfg?.verifyChannelId ? `<#${cfg.verifyChannelId}>` : '❌ no configurado'}`,
        `**Rol:** ${cfg?.verifyRoleId ? `<@&${cfg.verifyRoleId}>` : '❌ no configurado'}`,
        `**Mensaje:** ${cfg?.verifyMessage ?? 'por defecto'}`,
      ];
      return interaction.reply({ embeds: [infoEmbed('Configuración de verificación', lines.join('\n'))], flags: 64 });
    }
  },
};
