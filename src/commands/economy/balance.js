import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getEconomy } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig } from '../../models/GuildEconomyConfig.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Consulta tu saldo o el de otro usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const [eco, cfg] = await Promise.all([
      getEconomy(interaction.guild.id, target.id),
      ensureEconomyConfig(interaction.guild.id),
    ]);

    const balance = eco?.balance ?? 0;
    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
      .setDescription(`**${balance.toLocaleString()} ${cfg.currencyEmoji} ${cfg.currencyName}**`)
      .setFooter({ text: interaction.guild.name });

    return interaction.reply({ embeds: [embed] });
  },
};
