import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import ms from 'ms';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { isModeratable } from '../../utils/permCheck.js';
import { sendModLog } from '../../utils/modLogger.js';

const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000; // 28 días en ms

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Aplica un timeout a un usuario (1min – 28 días)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 1h, 30m, 7d)').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón')),

  async execute(interaction) {
    const target   = interaction.options.getMember('usuario');
    const duration = interaction.options.getString('duracion');
    const reason   = interaction.options.getString('razon') ?? 'Sin razón especificada';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
    if (!isModeratable(interaction, target)) return interaction.reply({ embeds: [errorEmbed('No puedo silenciar a este usuario.')], flags: 64 });

    const durationMs = ms(duration);
    if (!durationMs || durationMs < 60000 || durationMs > MAX_TIMEOUT) {
      return interaction.reply({ embeds: [errorEmbed('Duración inválida. Mínimo `1m`, máximo `28d`.')], flags: 64 });
    }

    await target.timeout(durationMs, `${reason} | Mod: ${interaction.user.tag}`);

    await sendModLog(interaction.guild, {
      action: '🔇 Timeout aplicado',
      color: 0xFEE75C,
      fields: [
        ['Usuario', `${target.user.tag} (\`${target.id}\`)`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Duración', duration, true],
        ['Razón', reason, false],
        ['Expira', `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`, false],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Timeout aplicado', `**${target.user.tag}** tiene timeout por **${duration}**.\n**Razón:** ${reason}`)] });
  },
};
