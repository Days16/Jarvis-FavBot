import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getLeaderboard } from '../../models/GuildLevel.js';
import { getEconomyLeaderboard } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig } from '../../models/GuildEconomyConfig.js';
import { calcLevel } from '../../utils/levelManager.js';

const MEDALS = ['🥇', '🥈', '🥉'];

async function resolveName(guild, userId) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    return member ? member.displayName : `Usuario desconocido`;
  } catch {
    return `Usuario desconocido`;
  }
}

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Clasificación del servidor')
    .addStringOption(o => o.setName('tipo')
      .setDescription('Tipo de clasificación')
      .addChoices(
        { name: '⭐ Niveles', value: 'niveles' },
        { name: '🪙 Economía', value: 'economia' },
      )),

  async execute(interaction) {
    await interaction.deferReply();
    const tipo = interaction.options.getString('tipo') ?? 'niveles';

    if (tipo === 'niveles') {
      const data = await getLeaderboard(interaction.guild.id, 10);
      if (!data.length) return interaction.editReply({ content: 'No hay datos de niveles todavía.' });

      const lines = await Promise.all(data.map(async (entry, i) => {
        const { level } = calcLevel(entry.xp);
        const name = await resolveName(interaction.guild, entry.userId);
        const prefix = MEDALS[i] ?? `**${i + 1}.**`;
        return `${prefix} ${name} — Nivel ${level} (${entry.xp.toLocaleString()} XP)`;
      }));

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle(`⭐ Clasificación de niveles — ${interaction.guild.name}`)
          .setDescription(lines.join('\n'))
          .setTimestamp()],
      });
    }

    if (tipo === 'economia') {
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      const data = await getEconomyLeaderboard(interaction.guild.id, 10);
      if (!data.length) return interaction.editReply({ content: 'No hay datos de economía todavía.' });

      const lines = await Promise.all(data.map(async (entry, i) => {
        const name = await resolveName(interaction.guild, entry.userId);
        const prefix = MEDALS[i] ?? `**${i + 1}.**`;
        return `${prefix} ${name} — ${entry.balance.toLocaleString()} ${cfg.currencyEmoji}`;
      }));

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle(`${cfg.currencyEmoji} Clasificación de economía — ${interaction.guild.name}`)
          .setDescription(lines.join('\n'))
          .setTimestamp()],
      });
    }
  },
};
