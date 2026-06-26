import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../../utils/embedBuilder.js';

const VERIFICATION = ['Ninguna', 'Baja', 'Media', 'Alta', 'Muy alta'];
const BOOST_LEVEL  = ['Sin nivel', 'Nivel 1', 'Nivel 2', 'Nivel 3'];

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Muestra información del servidor'),

  async execute(interaction) {
    await interaction.deferReply();
    const { guild } = interaction;
    await guild.fetch();

    const members  = guild.memberCount;
    const bots     = guild.members.cache.filter(m => m.user.bot).size;
    const channels = guild.channels.cache;
    const text     = channels.filter(c => c.isTextBased() && !c.isThread()).size;
    const voice    = channels.filter(c => c.isVoiceBased()).size;
    const roles    = guild.roles.cache.size - 1;
    const emojis   = guild.emojis.cache.size;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: guild.id, inline: true },
        { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Miembros', value: `${members} (${bots} bots)`, inline: true },
        { name: '📢 Canales', value: `💬 ${text} | 🔊 ${voice}`, inline: true },
        { name: '🎭 Roles', value: String(roles), inline: true },
        { name: '😀 Emojis', value: String(emojis), inline: true },
        { name: '🔐 Verificación', value: VERIFICATION[guild.verificationLevel] ?? 'Desconocido', inline: true },
        { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount} (${BOOST_LEVEL[guild.premiumTier]})`, inline: true },
      )
      .setTimestamp();

    if (guild.description) embed.setDescription(guild.description);
    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

    await interaction.editReply({ embeds: [embed] });
  },
};
