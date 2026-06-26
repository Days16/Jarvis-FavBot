import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed, COLORS } from '../../utils/embedBuilder.js';
import { ensureGuild, updateGuild } from '../../models/Guild.js';

const LABELS = {
  antiflood: 'Antiflood', antiCaps: 'Anti-mayúsculas', antiInvite: 'Anti-invitaciones',
  antiSpam: 'Anti-spam', antiRaid: 'Anti-raid', antiDehoist: 'Anti-dehoist',
};

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configura el sistema de moderación automática')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('status').setDescription('Muestra el estado actual del automod'))
    .addSubcommand(sub =>
      sub.setName('toggle').setDescription('Activa o desactiva el automod o un módulo')
        .addStringOption(o =>
          o.setName('modulo').setDescription('Módulo a cambiar').setRequired(true)
            .addChoices(
              { name: 'Automod global',      value: 'global' },
              { name: 'Antiflood',           value: 'antiflood' },
              { name: 'Anti-mayúsculas',     value: 'antiCaps' },
              { name: 'Anti-invitaciones',   value: 'antiInvite' },
              { name: 'Anti-spam',           value: 'antiSpam' },
              { name: 'Anti-raid',           value: 'antiRaid' },
              { name: 'Anti-dehoist',        value: 'antiDehoist' },
            )
        )
    )
    .addSubcommandGroup(group =>
      group.setName('whitelist').setDescription('Gestiona la whitelist del automod')
        .addSubcommand(sub =>
          sub.setName('add-role').setDescription('Añade un rol a la whitelist')
            .addRoleOption(o => o.setName('rol').setDescription('Rol exento').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove-role').setDescription('Elimina un rol de la whitelist')
            .addRoleOption(o => o.setName('rol').setDescription('Rol a eliminar').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('add-channel').setDescription('Añade un canal a la whitelist')
            .addChannelOption(o => o.setName('canal').setDescription('Canal exento').setRequired(true))
        )
        .addSubcommand(sub =>
          sub.setName('remove-channel').setDescription('Elimina un canal de la whitelist')
            .addChannelOption(o => o.setName('canal').setDescription('Canal a eliminar').setRequired(true))
        )
    ),

  async execute(interaction) {
    const sub   = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    const guildData = await ensureGuild(interaction.guild.id);

    // STATUS
    if (sub === 'status') {
      const a = guildData.automod;
      const s = v => v ? '✅' : '❌';
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('🤖 Estado del Automod')
        .addFields(
          { name: `${s(a.enabled)} Global`,            value: '​', inline: true },
          { name: `${s(a.antiflood?.enabled)} Antiflood`,       value: '​', inline: true },
          { name: `${s(a.antiCaps?.enabled)} Anti-mayúsculas`,  value: '​', inline: true },
          { name: `${s(a.antiInvite?.enabled)} Anti-invitaciones`, value: '​', inline: true },
          { name: `${s(a.antiSpam?.enabled)} Anti-spam`,        value: '​', inline: true },
          { name: `${s(a.antiRaid?.enabled)} Anti-raid`,        value: '​', inline: true },
          { name: `${s(a.antiDehoist)} Anti-dehoist`,           value: '​', inline: true },
          { name: 'Roles exentos',    value: a.whitelist?.roles?.map(id => `<@&${id}>`).join(' ')    || 'Ninguno' },
          { name: 'Canales exentos',  value: a.whitelist?.channels?.map(id => `<#${id}>`).join(' ')  || 'Ninguno' },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // TOGGLE
    if (sub === 'toggle') {
      const modulo = interaction.options.getString('modulo');
      const a = { ...guildData.automod };

      let newState;
      if (modulo === 'global') {
        a.enabled = !a.enabled;
        newState = a.enabled;
      } else if (modulo === 'antiDehoist') {
        a.antiDehoist = !a.antiDehoist;
        newState = a.antiDehoist;
      } else {
        a[modulo] = { ...a[modulo], enabled: !a[modulo]?.enabled };
        newState = a[modulo].enabled;
      }

      await updateGuild(interaction.guild.id, { automod: a });
      const label = modulo === 'global' ? 'Automod global' : LABELS[modulo];
      return interaction.reply({ embeds: [successEmbed('Módulo actualizado', `**${label}**: ${newState ? '✅ Activado' : '❌ Desactivado'}`)] });
    }

    // WHITELIST
    if (group === 'whitelist') {
      const wl = {
        roles:    [...(guildData.automod.whitelist?.roles    ?? [])],
        channels: [...(guildData.automod.whitelist?.channels ?? [])],
      };

      if (sub === 'add-role') {
        const role = interaction.options.getRole('rol');
        if (wl.roles.includes(role.id)) return interaction.reply({ embeds: [errorEmbed('Ese rol ya está en la whitelist.')], flags: 64 });
        wl.roles.push(role.id);
        await updateGuild(interaction.guild.id, { automod: { ...guildData.automod, whitelist: wl } });
        return interaction.reply({ embeds: [successEmbed('Whitelist actualizada', `${role} añadido a la whitelist.`)] });
      }
      if (sub === 'remove-role') {
        const role = interaction.options.getRole('rol');
        wl.roles = wl.roles.filter(id => id !== role.id);
        await updateGuild(interaction.guild.id, { automod: { ...guildData.automod, whitelist: wl } });
        return interaction.reply({ embeds: [successEmbed('Whitelist actualizada', `${role} eliminado de la whitelist.`)] });
      }
      if (sub === 'add-channel') {
        const channel = interaction.options.getChannel('canal');
        if (wl.channels.includes(channel.id)) return interaction.reply({ embeds: [errorEmbed('Ese canal ya está en la whitelist.')], flags: 64 });
        wl.channels.push(channel.id);
        await updateGuild(interaction.guild.id, { automod: { ...guildData.automod, whitelist: wl } });
        return interaction.reply({ embeds: [successEmbed('Whitelist actualizada', `${channel} añadido a la whitelist.`)] });
      }
      if (sub === 'remove-channel') {
        const channel = interaction.options.getChannel('canal');
        wl.channels = wl.channels.filter(id => id !== channel.id);
        await updateGuild(interaction.guild.id, { automod: { ...guildData.automod, whitelist: wl } });
        return interaction.reply({ embeds: [successEmbed('Whitelist actualizada', `${channel} eliminado de la whitelist.`)] });
      }
    }
  },
};
