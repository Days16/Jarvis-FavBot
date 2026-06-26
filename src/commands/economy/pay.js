import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureEconomy, addBalance } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig } from '../../models/GuildEconomyConfig.js';
import { errorEmbed, successEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfiere monedas a otro usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Destinatario').setRequired(true))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a transferir').setMinValue(1).setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('No puedes enviarte monedas a ti mismo.')], flags: 64 });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('No puedes enviar monedas a un bot.')], flags: 64 });
    }

    const [senderEco, cfg] = await Promise.all([
      ensureEconomy(interaction.guild.id, interaction.user.id),
      ensureEconomyConfig(interaction.guild.id),
    ]);

    if (!cfg.enabled) {
      return interaction.reply({ embeds: [errorEmbed('La economía está desactivada en este servidor.')], flags: 64 });
    }
    if (senderEco.balance < amount) {
      return interaction.reply({ embeds: [errorEmbed(`No tienes suficientes ${cfg.currencyName}. Saldo: **${senderEco.balance.toLocaleString()} ${cfg.currencyEmoji}**`)], flags: 64 });
    }

    await Promise.all([
      addBalance(interaction.guild.id, interaction.user.id, -amount),
      addBalance(interaction.guild.id, target.id, amount),
    ]);

    const updated = await ensureEconomy(interaction.guild.id, interaction.user.id);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('💸 Transferencia realizada')
        .setDescription(`Enviaste **${amount.toLocaleString()} ${cfg.currencyEmoji}** a ${target}.`)
        .addFields({ name: 'Tu saldo restante', value: `${updated.balance.toLocaleString()} ${cfg.currencyEmoji}`, inline: true })],
    });
  },
};
