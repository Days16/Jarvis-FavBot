import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureEconomy, updateEconomy, addBalance } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig } from '../../models/GuildEconomyConfig.js';
import { errorEmbed } from '../../utils/embedBuilder.js';

const JOBS = [
  'repartidor de pizza', 'streamer', 'programador freelance', 'diseñador gráfico',
  'community manager', 'youtuber', 'escritor de blog', 'moderador de Discord',
  'fotógrafo', 'músico callejero', 'barista', 'entrenador personal',
  'traductora', 'chef a domicilio', 'tutor online',
];

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabaja para ganar monedas'),

  async execute(interaction) {
    const [eco, cfg] = await Promise.all([
      ensureEconomy(interaction.guild.id, interaction.user.id),
      ensureEconomyConfig(interaction.guild.id),
    ]);

    if (!cfg.enabled) {
      return interaction.reply({ embeds: [errorEmbed('La economía está desactivada en este servidor.')], flags: 64 });
    }

    if (eco.lastWork) {
      const elapsed = (Date.now() - new Date(eco.lastWork).getTime()) / 1000;
      if (elapsed < cfg.workCooldown) {
        const remaining = cfg.workCooldown - elapsed;
        const ts = Math.floor((Date.now() + remaining * 1000) / 1000);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`⏰ Ya trabajaste recientemente. Vuelve <t:${ts}:R>.`)],
          flags: 64,
        });
      }
    }

    const amount = Math.floor(Math.random() * (cfg.workMax - cfg.workMin + 1)) + cfg.workMin;
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    const updated = await addBalance(interaction.guild.id, interaction.user.id, amount);
    await updateEconomy(interaction.guild.id, interaction.user.id, { lastWork: new Date().toISOString() });

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('💼 Trabajo completado')
        .setDescription(`Trabajaste de **${job}** y ganaste **+${amount.toLocaleString()} ${cfg.currencyEmoji} ${cfg.currencyName}**.`)
        .addFields({ name: 'Saldo actual', value: `${updated.balance.toLocaleString()} ${cfg.currencyEmoji}`, inline: true })],
    });
  },
};
