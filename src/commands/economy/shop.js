import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureEconomy, addBalance } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig, updateEconomyConfig } from '../../models/GuildEconomyConfig.js';
import { errorEmbed, successEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Tienda del servidor')
    .addSubcommand(s => s.setName('ver').setDescription('Ver los artículos disponibles'))
    .addSubcommand(s => s.setName('comprar')
      .setDescription('Comprar un artículo')
      .addIntegerOption(o => o.setName('id').setDescription('ID del artículo').setMinValue(1).setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = await ensureEconomyConfig(interaction.guild.id);

    if (!cfg.enabled) {
      return interaction.reply({ embeds: [errorEmbed('La economía está desactivada en este servidor.')], flags: 64 });
    }

    if (sub === 'ver') {
      const items = cfg.shopItems.filter(i => i.stock !== 0);
      if (!items.length) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('La tienda está vacía.')], flags: 64 });
      }

      const lines = items.map(i =>
        `**[${i.id}] ${i.name}** — ${i.price.toLocaleString()} ${cfg.currencyEmoji}\n${i.description ?? ''}${i.stock > 0 ? ` *(${i.stock} disponibles)*` : ''}${i.role_id ? ` 🎭 <@&${i.role_id}>` : ''}`
      );

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle(`🏪 Tienda — ${interaction.guild.name}`)
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `Usa /shop comprar <id> para comprar` })],
      });
    }

    if (sub === 'comprar') {
      const id = interaction.options.getInteger('id');
      const item = cfg.shopItems.find(i => i.id === id);

      if (!item) return interaction.reply({ embeds: [errorEmbed(`No existe el artículo con ID **${id}**. Usa \`/shop ver\` para ver la lista.`)], flags: 64 });
      if (item.stock === 0) return interaction.reply({ embeds: [errorEmbed('Este artículo está agotado.')], flags: 64 });

      const eco = await ensureEconomy(interaction.guild.id, interaction.user.id);
      if (eco.balance < item.price) {
        return interaction.reply({ embeds: [errorEmbed(`No tienes suficientes ${cfg.currencyName}. Necesitas **${item.price.toLocaleString()} ${cfg.currencyEmoji}**, tienes **${eco.balance.toLocaleString()} ${cfg.currencyEmoji}**.`)], flags: 64 });
      }

      await addBalance(interaction.guild.id, interaction.user.id, -item.price);

      // Dar rol si el artículo tiene uno
      if (item.role_id) {
        const role = interaction.guild.roles.cache.get(item.role_id);
        if (role && !interaction.member.roles.cache.has(role.id)) {
          await interaction.member.roles.add(role).catch(() => {});
        }
      }

      // Reducir stock si no es ilimitado
      if (item.stock > 0) {
        const newItems = cfg.shopItems.map(i => i.id === id ? { ...i, stock: i.stock - 1 } : i);
        await updateEconomyConfig(interaction.guild.id, { shopItems: newItems });
      }

      const updated = await ensureEconomy(interaction.guild.id, interaction.user.id);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🛍️ Compra realizada')
          .setDescription(`Compraste **${item.name}** por **${item.price.toLocaleString()} ${cfg.currencyEmoji}**.${item.role_id ? `\nSe te ha asignado el rol <@&${item.role_id}>.` : ''}`)
          .addFields({ name: 'Saldo restante', value: `${updated.balance.toLocaleString()} ${cfg.currencyEmoji}`, inline: true })],
      });
    }
  },
};
