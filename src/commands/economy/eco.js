import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { ensureEconomy, updateEconomy, addBalance } from '../../models/GuildEconomy.js';
import { ensureEconomyConfig, updateEconomyConfig } from '../../models/GuildEconomyConfig.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Administración de la economía')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s.setName('give')
      .setDescription('Da monedas a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('take')
      .setDescription('Quita monedas a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('set')
      .setDescription('Establece el saldo exacto de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addIntegerOption(o => o.setName('cantidad').setDescription('Nuevo saldo').setMinValue(0).setRequired(true)))

    .addSubcommand(s => s.setName('reset')
      .setDescription('Resetea el saldo de un usuario a 0')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))

    .addSubcommand(s => s.setName('config')
      .setDescription('Configura la moneda y cantidades')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre de la moneda'))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji de la moneda'))
      .addIntegerOption(o => o.setName('daily').setDescription('Cantidad del daily').setMinValue(1))
      .addIntegerOption(o => o.setName('work_min').setDescription('Trabajo: mínimo').setMinValue(1))
      .addIntegerOption(o => o.setName('work_max').setDescription('Trabajo: máximo').setMinValue(1))
      .addIntegerOption(o => o.setName('work_cooldown').setDescription('Cooldown del trabajo en segundos').setMinValue(60)))

    .addSubcommand(s => s.setName('additem')
      .setDescription('Añade un artículo a la tienda')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del artículo').setRequired(true))
      .addIntegerOption(o => o.setName('precio').setDescription('Precio').setMinValue(1).setRequired(true))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción'))
      .addIntegerOption(o => o.setName('stock').setDescription('Stock (-1 = ilimitado)').setMinValue(-1))
      .addRoleOption(o => o.setName('rol').setDescription('Rol que se otorga al comprar')))

    .addSubcommand(s => s.setName('removeitem')
      .setDescription('Elimina un artículo de la tienda')
      .addIntegerOption(o => o.setName('id').setDescription('ID del artículo').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('toggle')
      .setDescription('Activa o desactiva la economía')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'give') {
      const target = interaction.options.getUser('usuario');
      const amount = interaction.options.getInteger('cantidad');
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      const updated = await addBalance(interaction.guild.id, target.id, amount);
      return interaction.reply({ embeds: [successEmbed('Monedas añadidas', `+${amount.toLocaleString()} ${cfg.currencyEmoji} a ${target}. Saldo: **${updated.balance.toLocaleString()}**`)], flags: 64 });
    }

    if (sub === 'take') {
      const target = interaction.options.getUser('usuario');
      const amount = interaction.options.getInteger('cantidad');
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      const updated = await addBalance(interaction.guild.id, target.id, -amount);
      return interaction.reply({ embeds: [successEmbed('Monedas quitadas', `-${amount.toLocaleString()} ${cfg.currencyEmoji} a ${target}. Saldo: **${updated.balance.toLocaleString()}**`)], flags: 64 });
    }

    if (sub === 'set') {
      const target = interaction.options.getUser('usuario');
      const amount = interaction.options.getInteger('cantidad');
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      await ensureEconomy(interaction.guild.id, target.id);
      await updateEconomy(interaction.guild.id, target.id, { balance: amount });
      return interaction.reply({ embeds: [successEmbed('Saldo establecido', `${target} ahora tiene **${amount.toLocaleString()} ${cfg.currencyEmoji}**.`)], flags: 64 });
    }

    if (sub === 'reset') {
      const target = interaction.options.getUser('usuario');
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      await ensureEconomy(interaction.guild.id, target.id);
      await updateEconomy(interaction.guild.id, target.id, { balance: 0 });
      return interaction.reply({ embeds: [successEmbed('Saldo reseteado', `${target} ahora tiene **0 ${cfg.currencyEmoji}**.`)], flags: 64 });
    }

    if (sub === 'config') {
      const nombre = interaction.options.getString('nombre');
      const emoji = interaction.options.getString('emoji');
      const daily = interaction.options.getInteger('daily');
      const workMin = interaction.options.getInteger('work_min');
      const workMax = interaction.options.getInteger('work_max');
      const workCooldown = interaction.options.getInteger('work_cooldown');

      if (!nombre && !emoji && !daily && !workMin && !workMax && !workCooldown) {
        return interaction.reply({ embeds: [errorEmbed('Especifica al menos un parámetro.')], flags: 64 });
      }

      await ensureEconomyConfig(interaction.guild.id);
      const updates = {};
      if (nombre) updates.currencyName = nombre;
      if (emoji) updates.currencyEmoji = emoji;
      if (daily) updates.dailyAmount = daily;
      if (workMin) updates.workMin = workMin;
      if (workMax) updates.workMax = workMax;
      if (workCooldown) updates.workCooldown = workCooldown;
      const cfg = await updateEconomyConfig(interaction.guild.id, updates);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Economía configurada')
          .addFields(
            { name: 'Moneda', value: `${cfg.currencyEmoji} ${cfg.currencyName}`, inline: true },
            { name: 'Daily', value: `${cfg.dailyAmount}`, inline: true },
            { name: 'Trabajo', value: `${cfg.workMin}–${cfg.workMax} (${cfg.workCooldown}s)`, inline: true },
          )],
        flags: 64,
      });
    }

    if (sub === 'additem') {
      const nombre = interaction.options.getString('nombre');
      const precio = interaction.options.getInteger('precio');
      const descripcion = interaction.options.getString('descripcion');
      const stock = interaction.options.getInteger('stock') ?? -1;
      const rol = interaction.options.getRole('rol');

      const cfg = await ensureEconomyConfig(interaction.guild.id);
      const nextId = cfg.shopItems.length > 0 ? Math.max(...cfg.shopItems.map(i => i.id)) + 1 : 1;

      const newItem = {
        id: nextId,
        name: nombre,
        description: descripcion ?? null,
        price: precio,
        stock,
        role_id: rol?.id ?? null,
      };

      await updateEconomyConfig(interaction.guild.id, { shopItems: [...cfg.shopItems, newItem] });
      return interaction.reply({ embeds: [successEmbed('Artículo añadido', `**[${nextId}] ${nombre}** — ${precio.toLocaleString()} ${cfg.currencyEmoji}${rol ? ` → ${rol}` : ''}`)], flags: 64 });
    }

    if (sub === 'removeitem') {
      const id = interaction.options.getInteger('id');
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      const item = cfg.shopItems.find(i => i.id === id);
      if (!item) return interaction.reply({ embeds: [errorEmbed(`No existe el artículo con ID **${id}**.`)], flags: 64 });
      await updateEconomyConfig(interaction.guild.id, { shopItems: cfg.shopItems.filter(i => i.id !== id) });
      return interaction.reply({ embeds: [successEmbed('Artículo eliminado', `**${item.name}** eliminado de la tienda.`)], flags: 64 });
    }

    if (sub === 'toggle') {
      const cfg = await ensureEconomyConfig(interaction.guild.id);
      const nuevo = !cfg.enabled;
      await updateEconomyConfig(interaction.guild.id, { enabled: nuevo });
      return interaction.reply({ embeds: [successEmbed(`Economía ${nuevo ? 'activada' : 'desactivada'}`, `El sistema de economía está ahora **${nuevo ? 'activo ✅' : 'inactivo ❌'}**.`)], flags: 64 });
    }
  },
};
