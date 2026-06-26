import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import ms from 'ms';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { isModeratable } from '../../utils/permCheck.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón del ban'))
    .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 7d, 1h). Sin valor = permanente'))
    .addIntegerOption(o => o.setName('borrar_mensajes').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const target   = interaction.options.getMember('usuario');
    const reason   = interaction.options.getString('razon') ?? 'Sin razón especificada';
    const duration = interaction.options.getString('duracion');
    const delDays  = interaction.options.getInteger('borrar_mensajes') ?? 0;

    if (!target) return interaction.reply({ embeds: [errorEmbed('Usuario no encontrado en el servidor.')], flags: 64 });
    if (!isModeratable(interaction, target)) return interaction.reply({ embeds: [errorEmbed('No puedo banear a este usuario.')], flags: 64 });

    let durationMs = null;
    if (duration) {
      durationMs = ms(duration);
      if (!durationMs) return interaction.reply({ embeds: [errorEmbed('Duración inválida. Ejemplos: `7d`, `1h`, `30m`')], flags: 64 });
    }

    try { await target.send({ embeds: [errorEmbed(`Has sido baneado de **${interaction.guild.name}**.\n**Razón:** ${reason}\n**Duración:** ${duration ?? 'Permanente'}`)] }); } catch { }

    await target.ban({ reason: `${reason} | Mod: ${interaction.user.tag}`, deleteMessageDays: delDays });

    await sendModLog(interaction.guild, {
      action: '🔨 Usuario baneado',
      color: 0xED4245,
      fields: [
        ['Usuario', `${target.user.tag} (\`${target.id}\`)`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Razón', reason, false],
        ['Duración', duration ?? 'Permanente', true],
        ['Mensajes borrados', `${delDays}d`, true],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Usuario baneado', `**${target.user.tag}** fue baneado.\n**Razón:** ${reason}`)] });

    if (durationMs) {
      setTimeout(() => interaction.guild.members.unban(target.id, 'Ban temporal expirado').catch(() => {}), durationMs);
    }
  },
};
