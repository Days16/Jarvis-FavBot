import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, warnEmbed } from '../../utils/embedBuilder.js';
import { isModeratable } from '../../utils/permCheck.js';
import { addWarn } from '../../utils/warnSystem.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Añade una advertencia a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
    if (!isModeratable(interaction, target, { requireBotAbove: false })) return interaction.reply({ embeds: [errorEmbed('No puedes advertir a este usuario.')], flags: 64 });

    const { warnId, totalActive, autoAction } = await addWarn(
      interaction.guild, target.id, interaction.user.id, reason
    );

    // DM al usuario
    try {
      await target.send({ embeds: [warnEmbed(`Advertencia en ${interaction.guild.name}`, `**Razón:** ${reason}\n**ID:** \`${warnId}\`\n**Total warns:** ${totalActive}`)] });
    } catch { }

    await sendModLog(interaction.guild, {
      action: '⚠️ Advertencia emitida',
      color: 0xFEE75C,
      fields: [
        ['Usuario', `${target.user.tag} (\`${target.id}\`)`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['ID Warn', warnId, true],
        ['Total warns', String(totalActive), true],
        ['Razón', reason, false],
      ],
    });

    let desc = `**${target.user.tag}** recibió una advertencia.\n**Razón:** ${reason}\n**ID:** \`${warnId}\`\n**Total warns:** ${totalActive}`;

    if (autoAction) {
      if (autoAction.type === 'timeout') {
        await target.timeout(autoAction.durationMs, `Umbral de warns (${totalActive})`).catch(() => {});
        desc += `\n\n⚡ **Acción automática:** Timeout de ${autoAction.label}`;
      } else if (autoAction.type === 'ban') {
        try { await target.send({ embeds: [errorEmbed(`Has sido baneado de **${interaction.guild.name}** por acumular ${totalActive} advertencias.`)] }); } catch { }
        await target.ban({ reason: `Umbral de warns alcanzado (${totalActive})` }).catch(() => {});
        desc += `\n\n⚡ **Acción automática:** Ban permanente`;
      }
    }

    await interaction.reply({ embeds: [successEmbed('Advertencia registrada', desc)] });
  },
};
