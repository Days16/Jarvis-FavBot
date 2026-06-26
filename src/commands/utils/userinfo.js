import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Muestra información de un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getMember('usuario') ?? interaction.member;
    const user   = target.user ?? await target.fetch();

    const roles = [...target.roles.cache.values()]
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .slice(0, 10)
      .map(r => r.toString())
      .join(' ') || 'Sin roles';

    const flags = (await user.fetchFlags()).toArray().join(', ') || 'Ninguna';

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor || COLORS.primary)
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Sí' : 'No', inline: true },
        { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Entró al servidor', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '🎨 Color', value: target.displayHexColor || 'N/A', inline: true },
        { name: '🏷 Apodo', value: target.nickname || 'Sin apodo', inline: true },
        { name: `🎭 Roles (${target.roles.cache.size - 1})`, value: roles, inline: false },
        { name: '🏅 Insignias', value: flags, inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
