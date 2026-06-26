import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Cambia o elimina el apodo de un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('apodo').setDescription('Nuevo apodo. Vacío para eliminar el actual').setMaxLength(32)),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const nick   = interaction.options.getString('apodo') ?? null;

    if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
    if (!target.manageable) return interaction.reply({ embeds: [errorEmbed('No puedo cambiar el apodo de este usuario.')], flags: 64 });

    await target.setNickname(nick, `Cambio de nick por ${interaction.user.tag}`);

    const msg = nick
      ? `El apodo de **${target.user.tag}** fue cambiado a **${nick}**.`
      : `El apodo de **${target.user.tag}** fue eliminado.`;

    await interaction.reply({ embeds: [successEmbed('Apodo actualizado', msg)] });
  },
};
