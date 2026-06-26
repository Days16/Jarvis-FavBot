import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Bloquea el canal para @everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('canal').setDescription('Canal a bloquear (por defecto el actual)'))
    .addStringOption(o => o.setName('razon').setDescription('Razón del bloqueo')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('canal') ?? interaction.channel;
    const reason  = interaction.options.getString('razon') ?? 'Sin razón especificada';

    if (!channel.isTextBased()) {
      return interaction.reply({ embeds: [errorEmbed('Solo puedo bloquear canales de texto.')], flags: 64 });
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
    }, { reason: `Lockdown por ${interaction.user.tag}: ${reason}` });

    await sendModLog(interaction.guild, {
      action: '🔒 Canal bloqueado',
      color: 0xED4245,
      fields: [
        ['Canal', `${channel}`, true],
        ['Moderador', `${interaction.user.tag}`, true],
        ['Razón', reason, false],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Canal bloqueado', `${channel} ha sido bloqueado para @everyone.\n**Razón:** ${reason}`)] });
  },
};
