import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Elimina el timeout de un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón')),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon') ?? 'Sin razón especificada';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
    if (!target.communicationDisabledUntil) {
      return interaction.reply({ embeds: [errorEmbed('Este usuario no tiene ningún timeout activo.')], flags: 64 });
    }

    await target.timeout(null, `${reason} | Mod: ${interaction.user.tag}`);

    await sendModLog(interaction.guild, {
      action: '🔊 Timeout eliminado',
      color: 0x57F287,
      fields: [
        ['Usuario', `${target.user.tag} (\`${target.id}\`)`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Razón', reason, false],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Timeout eliminado', `El timeout de **${target.user.tag}** fue levantado.`)] });
  },
};
