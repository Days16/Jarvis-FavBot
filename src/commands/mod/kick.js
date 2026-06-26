import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { isModeratable } from '../../utils/permCheck.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón de la expulsión')),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon') ?? 'Sin razón especificada';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado.')], flags: 64 });
    if (!isModeratable(interaction, target)) return interaction.reply({ embeds: [errorEmbed('No puedo expulsar a este usuario.')], flags: 64 });

    try { await target.send({ embeds: [errorEmbed(`Has sido expulsado de **${interaction.guild.name}**.\n**Razón:** ${reason}`)] }); } catch { }

    await target.kick(`${reason} | Mod: ${interaction.user.tag}`);

    await sendModLog(interaction.guild, {
      action: '👢 Usuario expulsado',
      color: 0xFEA500,
      fields: [
        ['Usuario', `${target.user.tag} (\`${target.id}\`)`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Razón', reason, false],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Usuario expulsado', `**${target.user.tag}** fue expulsado.\n**Razón:** ${reason}`)] });
  },
};
