import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Configura el modo lento del canal (0 para desactivar)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o => o.setName('segundos').setDescription('Segundos entre mensajes (0-21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(o => o.setName('canal').setDescription('Canal a configurar (por defecto el actual)')),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('segundos');
    const channel = interaction.options.getChannel('canal') ?? interaction.channel;

    await channel.setRateLimitPerUser(seconds, `Slowmode por ${interaction.user.tag}`);

    const msg = seconds === 0
      ? `El modo lento en ${channel} fue **desactivado**.`
      : `El modo lento en ${channel} se configuró a **${seconds}s** entre mensajes.`;

    await interaction.reply({ embeds: [successEmbed('Modo lento actualizado', msg)] });
  },
};
