import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';
import { getAutoroles, addAutorole, removeAutorole } from '../../models/Autorole.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Roles que se asignan automáticamente al entrar')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('add').setDescription('Añade un rol al autorole')
      .addRoleOption(o => o.setName('rol').setDescription('Rol a asignar').setRequired(true))
      .addBooleanOption(o => o.setName('bots').setDescription('¿Solo para bots?').setRequired(false))
      .addIntegerOption(o => o.setName('delay').setDescription('Segundos de retraso (0 = inmediato)').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Quita un rol del autorole')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Lista todos los autoroles configurados')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const role = interaction.options.getRole('rol');
      const forBots = interaction.options.getBoolean('bots') ?? false;
      const delay = Math.max(0, Math.min(3600, interaction.options.getInteger('delay') ?? 0));

      if (!interaction.guild.members.me.roles.highest.comparePositionTo(role) > 0) {
        return interaction.reply({ embeds: [errorEmbed('El bot no tiene el rol suficientemente alto para asignar ese rol.')], flags: 64 });
      }

      const result = await addAutorole(guildId, role.id, forBots, delay);
      if (!result) return interaction.reply({ embeds: [errorEmbed('Ese rol ya está en el autorole.')], flags: 64 });

      const desc = [
        `${role} añadido al autorole.`,
        `**Para:** ${forBots ? 'Bots' : 'Usuarios'}`,
        delay ? `**Retraso:** ${delay}s` : '',
      ].filter(Boolean).join('\n');

      return interaction.reply({ embeds: [successEmbed('Autorole añadido', desc)] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('rol');
      const result = await removeAutorole(guildId, role.id);
      if (!result) return interaction.reply({ embeds: [errorEmbed('Ese rol no estaba en el autorole.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Autorole quitado', `${role} eliminado del autorole.`)] });
    }

    if (sub === 'list') {
      const autoroles = await getAutoroles(guildId);
      if (!autoroles.length) return interaction.reply({ embeds: [infoEmbed('Sin autoroles', 'No hay autoroles configurados.')], flags: 64 });

      const lines = autoroles.map(ar => {
        const role = interaction.guild.roles.cache.get(ar.roleId);
        const dest = ar.forBots ? '🤖 Bots' : '👤 Usuarios';
        const delay = ar.delaySecs ? ` — ${ar.delaySecs}s` : '';
        return `${role ?? `<@&${ar.roleId}>`} — ${dest}${delay}`;
      });

      return interaction.reply({ embeds: [infoEmbed(`Autoroles (${autoroles.length})`, lines.join('\n'))], flags: 64 });
    }
  },
};
