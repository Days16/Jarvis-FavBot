import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Gestión manual de roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('give').setDescription('Asigna un rol a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('take').setDescription('Quita un rol a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('info').setDescription('Información sobre un rol')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('members').setDescription('Lista miembros con un rol (máx. 30)')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('color').setDescription('Cambia el color de un rol')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Color en HEX (#FF5733)').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'give') {
      const member = interaction.options.getMember('usuario');
      const role = interaction.options.getRole('rol');
      if (!member) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
      if (!role.editable) return interaction.reply({ embeds: [errorEmbed('No tengo permisos para asignar ese rol.')], flags: 64 });
      if (member.roles.cache.has(role.id)) return interaction.reply({ embeds: [errorEmbed(`${member} ya tiene ${role}.`)], flags: 64 });
      await member.roles.add(role);
      return interaction.reply({ embeds: [successEmbed('Rol asignado', `${role} asignado a ${member}.`)] });
    }

    if (sub === 'take') {
      const member = interaction.options.getMember('usuario');
      const role = interaction.options.getRole('rol');
      if (!member) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
      if (!role.editable) return interaction.reply({ embeds: [errorEmbed('No tengo permisos para quitar ese rol.')], flags: 64 });
      if (!member.roles.cache.has(role.id)) return interaction.reply({ embeds: [errorEmbed(`${member} no tiene ${role}.`)], flags: 64 });
      await member.roles.remove(role);
      return interaction.reply({ embeds: [successEmbed('Rol quitado', `${role} quitado a ${member}.`)] });
    }

    if (sub === 'info') {
      const role = interaction.options.getRole('rol');
      const embed = new EmbedBuilder()
        .setColor(role.color || 0x5865f2)
        .setTitle(`Información del rol: ${role.name}`)
        .addFields(
          { name: 'ID', value: role.id, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Posición', value: String(role.position), inline: true },
          { name: 'Mentionable', value: role.mentionable ? '✅' : '❌', inline: true },
          { name: 'Hoisted', value: role.hoist ? '✅' : '❌', inline: true },
          { name: 'Managed', value: role.managed ? '✅' : '❌', inline: true },
          { name: 'Creado', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Miembros', value: String(role.members.size), inline: true },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'members') {
      const role = interaction.options.getRole('rol');
      await guild.members.fetch();
      const members = role.members;
      if (!members.size) return interaction.reply({ embeds: [infoEmbed('Sin miembros', `Nadie tiene ${role}.`)], flags: 64 });

      const list = [...members.values()].slice(0, 30).map(m => m.toString()).join(', ');
      const extra = members.size > 30 ? `\n…y ${members.size - 30} más.` : '';

      return interaction.reply({ embeds: [infoEmbed(`Miembros con ${role.name} (${members.size})`, list + extra)], flags: 64 });
    }

    if (sub === 'color') {
      const role = interaction.options.getRole('rol');
      const colorStr = interaction.options.getString('color');
      const hex = colorStr.startsWith('#') ? colorStr : `#${colorStr}`;
      const num = parseInt(hex.slice(1), 16);
      if (isNaN(num)) return interaction.reply({ embeds: [errorEmbed('Color HEX inválido.')], flags: 64 });
      if (!role.editable) return interaction.reply({ embeds: [errorEmbed('No tengo permisos para editar ese rol.')], flags: 64 });
      await role.setColor(num);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(num).setDescription(`Color de ${role} cambiado a **${hex}**.`)] });
    }
  },
};
