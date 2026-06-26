import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureEconomy, updateEconomy, addBalance } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig } from '../../models/GuildEconomyConfig.js';
import { errorEmbed } from '../../utils/embedBuilder.js';

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Reclama tu recompensa diaria'),

  async execute(interaction) {
    const [eco, cfg] = await Promise.all([
      ensureEconomy(interaction.guild.id, interaction.user.id),
      ensureEconomyConfig(interaction.guild.id),
    ]);

    if (!cfg.enabled) {
      return interaction.reply({ embeds: [errorEmbed('La economía está desactivada en este servidor.')], flags: 64 });
    }

    if (eco.lastDaily) {
      const elapsed = Date.now() - new Date(eco.lastDaily).getTime();
      if (elapsed < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - elapsed;
        const ts = Math.floor((Date.now() + remaining) / 1000);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`⏰ Ya reclamaste tu daily. Vuelve <t:${ts}:R>.`)],
          flags: 64,
        });
      }
    }

    const amount = cfg.dailyAmount;
    const updated = await addBalance(interaction.guild.id, interaction.user.id, amount);
    await updateEconomy(interaction.guild.id, interaction.user.id, { lastDaily: new Date().toISOString() });

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('💰 Recompensa diaria reclamada')
        .setDescription(`Has recibido **+${amount.toLocaleString()} ${cfg.currencyEmoji} ${cfg.currencyName}**`)
        .addFields({ name: 'Saldo actual', value: `${updated.balance.toLocaleString()} ${cfg.currencyEmoji}`, inline: true })
        .setFooter({ text: 'Vuelve mañana para reclamar de nuevo' })],
    });
  },
};
