import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getRank } from '../../models/GuildLevel.js';
import { calcLevel } from '../../utils/levelManager.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Muestra tu nivel y XP en el servidor')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const data = await getRank(interaction.guild.id, target.id);

    if (!data || data.xp === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`${target} aún no ha ganado XP en este servidor.`)],
        flags: 64,
      });
    }

    const { level, currentXp, xpNeeded } = calcLevel(data.xp);
    const filled = Math.round((currentXp / xpNeeded) * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
      .addFields(
        { name: '⭐ Nivel', value: String(level), inline: true },
        { name: '🏆 Puesto', value: `#${data.rank}`, inline: true },
        { name: '✨ XP total', value: data.xp.toLocaleString(), inline: true },
        { name: `Progreso al nivel ${level + 1}`, value: `\`${bar}\` ${currentXp.toLocaleString()}/${xpNeeded.toLocaleString()} XP`, inline: false },
      )
      .setFooter({ text: interaction.guild.name });

    return interaction.reply({ embeds: [embed] });
  },
};
