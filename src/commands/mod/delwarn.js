import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { removeWarn } from '../../utils/warnSystem.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('delwarn')
    .setDescription('Elimina una advertencia por su ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('id').setDescription('ID de la advertencia (ej: WARN-A1B2C3)').setRequired(true)),

  async execute(interaction) {
    const warnId = interaction.options.getString('id').toUpperCase();

    const warn = await removeWarn(warnId, interaction.guild.id);
    if (!warn) {
      return interaction.reply({ embeds: [errorEmbed(`No se encontró la advertencia \`${warnId}\` en este servidor.`)], flags: 64 });
    }

    await sendModLog(interaction.guild, {
      action: '🗑️ Advertencia eliminada',
      color: 0x57F287,
      fields: [
        ['ID Warn', warnId, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Razón original', warn.reason, false],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Advertencia eliminada', `La advertencia \`${warnId}\` fue eliminada correctamente.`)] });
  },
};
