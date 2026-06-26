import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('rolechannel')
    .setDescription('Gestiona canales exclusivos por rol')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(s => s.setName('create').setDescription('Crea un canal visible solo para un rol')
      .addRoleOption(o => o.setName('rol').setDescription('Rol con acceso').setRequired(true))
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del canal').setRequired(true))
      .addStringOption(o => o.setName('categoria').setDescription('ID de categoría donde crearlo')))
    .addSubcommand(s => s.setName('add').setDescription('Añade acceso de un rol a un canal existente')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Quita el acceso de un rol a un canal')
      .addChannelOption(o => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Lista canales con permisos de rol especiales')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'create') {
      const role = interaction.options.getRole('rol');
      const nombre = interaction.options.getString('nombre').toLowerCase().replace(/\s+/g, '-');
      const catId = interaction.options.getString('categoria');

      let parent = null;
      if (catId) {
        parent = guild.channels.cache.get(catId);
        if (!parent || parent.type !== ChannelType.GuildCategory) {
          return interaction.reply({ embeds: [errorEmbed('Categoría no encontrada.')], flags: 64 });
        }
      }

      const channel = await guild.channels.create({
        name: nombre,
        type: ChannelType.GuildText,
        parent: parent?.id ?? null,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: guild.members.me, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });

      return interaction.reply({ embeds: [successEmbed('Canal creado', `${channel} es visible solo para ${role}.`)] });
    }

    if (sub === 'add') {
      const channel = interaction.options.getChannel('canal');
      const role = interaction.options.getRole('rol');
      await channel.permissionOverwrites.create(role, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      return interaction.reply({ embeds: [successEmbed('Acceso añadido', `${role} ahora tiene acceso a ${channel}.`)] });
    }

    if (sub === 'remove') {
      const channel = interaction.options.getChannel('canal');
      const role = interaction.options.getRole('rol');
      await channel.permissionOverwrites.delete(role);
      return interaction.reply({ embeds: [successEmbed('Acceso quitado', `${role} ya no tiene acceso a ${channel}.`)] });
    }

    if (sub === 'list') {
      const channels = guild.channels.cache.filter(c => {
        if (!c.isTextBased()) return false;
        const overrides = c.permissionOverwrites.cache;
        const everyoneDeny = overrides.get(guild.roles.everyone.id);
        return everyoneDeny?.deny.has(PermissionFlagsBits.ViewChannel) && overrides.size > 2;
      });

      if (!channels.size) return interaction.reply({ embeds: [infoEmbed('Sin canales exclusivos', 'No hay canales con acceso restringido por rol.')], flags: 64 });

      const lines = [...channels.values()].slice(0, 25).map(c => {
        const roles = [...c.permissionOverwrites.cache.values()]
          .filter(o => o.type === 0 && o.id !== guild.roles.everyone.id)
          .map(o => `<@&${o.id}>`)
          .join(', ');
        return `${c} — ${roles || 'sin roles'}`;
      });

      return interaction.reply({ embeds: [infoEmbed(`Canales exclusivos (${channels.size})`, lines.join('\n'))], flags: 64 });
    }
  },
};
