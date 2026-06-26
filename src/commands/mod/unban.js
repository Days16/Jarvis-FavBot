import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Levanta el ban de un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('userid').setDescription('ID del usuario a desbanear').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón del desban')),

  async execute(interaction) {
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('razon') ?? 'Sin razón especificada';

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({ embeds: [errorEmbed('ID de usuario inválido.')], flags: 64 });
    }

    const bans = await interaction.guild.bans.fetch().catch(() => null);
    const ban  = bans?.get(userId);
    if (!ban) return interaction.reply({ embeds: [errorEmbed('Este usuario no tiene un ban activo en el servidor.')], flags: 64 });

    await interaction.guild.members.unban(userId, `${reason} | Mod: ${interaction.user.tag}`);

    await sendModLog(interaction.guild, {
      action: '✅ Usuario desbaneado',
      color: 0x57F287,
      fields: [
        ['Usuario', `${ban.user.tag} (\`${userId}\`)`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Razón', reason, false],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Usuario desbaneado', `**${ban.user.tag}** fue desbaneado.\n**Razón:** ${reason}`)] });
  },
};
