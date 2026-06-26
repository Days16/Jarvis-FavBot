import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embedBuilder.js';
import { sendModLog } from '../../utils/modLogger.js';

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Reabre un canal bloqueado')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('canal').setDescription('Canal a reabrir (por defecto el actual)')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('canal') ?? interaction.channel;

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null,
    }, { reason: `Unlock por ${interaction.user.tag}` });

    await sendModLog(interaction.guild, {
      action: '🔓 Canal reabierto',
      color: 0x57F287,
      fields: [
        ['Canal', `${channel}`, true],
        ['Moderador', `${interaction.user.tag}`, true],
      ],
    });

    await interaction.reply({ embeds: [successEmbed('Canal reabierto', `${channel} ha sido reabierto para @everyone.`)] });
  },
};
