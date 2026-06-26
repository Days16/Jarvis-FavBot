import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import ms from 'ms';
import { createGiveaway, getGiveaway, getActiveGiveaways, updateGiveaway } from '../../models/Giveaway.js';
import { buildGiveawayEmbed, buildGiveawayRow, endGiveaway } from '../../utils/giveawayManager.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gestión de sorteos')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s.setName('crear')
      .setDescription('Crea un nuevo sorteo')
      .addStringOption(o => o.setName('premio').setDescription('Qué se sorteará').setRequired(true))
      .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 1h, 30m, 2d)').setRequired(true))
      .addIntegerOption(o => o.setName('ganadores').setDescription('Número de ganadores').setMinValue(1).setMaxValue(20))
      .addChannelOption(o => o.setName('canal').setDescription('Canal donde publicar (por defecto, el actual)'))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción adicional')))

    .addSubcommand(s => s.setName('terminar')
      .setDescription('Termina un sorteo antes de tiempo')
      .addIntegerOption(o => o.setName('id').setDescription('ID del sorteo').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('reroll')
      .setDescription('Vuelve a sortear los ganadores de un sorteo terminado')
      .addIntegerOption(o => o.setName('id').setDescription('ID del sorteo').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s.setName('lista')
      .setDescription('Muestra los sorteos activos'))

    .addSubcommand(s => s.setName('eliminar')
      .setDescription('Elimina un sorteo activo')
      .addIntegerOption(o => o.setName('id').setDescription('ID del sorteo').setMinValue(1).setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'crear') {
      const prize = interaction.options.getString('premio');
      const durationStr = interaction.options.getString('duracion');
      const winnersCount = interaction.options.getInteger('ganadores') ?? 1;
      const canal = interaction.options.getChannel('canal') ?? interaction.channel;
      const description = interaction.options.getString('descripcion');

      const duration = ms(durationStr);
      if (!duration || duration < 10000) {
        return interaction.reply({ embeds: [errorEmbed('Duración inválida. Ejemplos válidos: `30m`, `1h`, `2d`.')], flags: 64 });
      }

      const endAt = new Date(Date.now() + duration).toISOString();

      const giveaway = await createGiveaway({
        guildId: interaction.guild.id,
        channelId: canal.id,
        hostId: interaction.user.id,
        prize,
        description,
        winnersCount,
        endAt,
      });

      const embed = buildGiveawayEmbed(giveaway);
      const row = buildGiveawayRow(giveaway.id);

      const msg = await canal.send({ embeds: [embed], components: [row] });
      await updateGiveaway(giveaway.id, { messageId: msg.id });

      return interaction.reply({ embeds: [successEmbed('Sorteo creado', `Sorteo **${prize}** publicado en ${canal} (ID: ${giveaway.id}). Termina en ${durationStr}.`)], flags: 64 });
    }

    if (sub === 'terminar') {
      const id = interaction.options.getInteger('id');
      const giveaway = await getGiveaway(id);

      if (!giveaway || giveaway.guildId !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Sorteo no encontrado.')], flags: 64 });
      }
      if (giveaway.ended) {
        return interaction.reply({ embeds: [errorEmbed('Este sorteo ya ha terminado.')], flags: 64 });
      }

      await interaction.reply({ embeds: [successEmbed('Finalizando sorteo…', `Procesando sorteo #${id}`)], flags: 64 });
      await endGiveaway(interaction.client, giveaway);
    }

    if (sub === 'reroll') {
      const id = interaction.options.getInteger('id');
      const giveaway = await getGiveaway(id);

      if (!giveaway || giveaway.guildId !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Sorteo no encontrado.')], flags: 64 });
      }
      if (!giveaway.ended) {
        return interaction.reply({ embeds: [errorEmbed('Este sorteo todavía no ha terminado. Usa `/giveaway terminar` primero.')], flags: 64 });
      }
      if (!giveaway.participants.length) {
        return interaction.reply({ embeds: [errorEmbed('No hay participantes para resorterear.')], flags: 64 });
      }

      const count = Math.min(giveaway.winnersCount, giveaway.participants.length);
      const newWinners = giveaway.participants.sort(() => Math.random() - 0.5).slice(0, count);
      await updateGiveaway(id, { winnerIds: newWinners });

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);
      if (channel && giveaway.messageId) {
        const updatedGiveaway = await getGiveaway(id);
        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (msg) await msg.edit({ embeds: [buildGiveawayEmbed(updatedGiveaway)] }).catch(() => {});
        await channel.send({ content: `🔁 **Reroll** — Nuevos ganadores de **${giveaway.prize}**: ${newWinners.map(id => `<@${id}>`).join(', ')}` }).catch(() => {});
      }

      return interaction.reply({ embeds: [successEmbed('Reroll realizado', `Nuevos ganadores: ${newWinners.map(id => `<@${id}>`).join(', ')}`)], flags: 64 });
    }

    if (sub === 'lista') {
      const giveaways = await getActiveGiveaways(interaction.guild.id);
      if (!giveaways.length) {
        return interaction.reply({ embeds: [infoEmbed('Sin sorteos activos', 'No hay ningún sorteo en curso.')], flags: 64 });
      }

      const lines = giveaways.map(g => {
        const ts = Math.floor(new Date(g.endAt).getTime() / 1000);
        return `**[${g.id}] ${g.prize}** — ${g.participants.length} participantes — Termina <t:${ts}:R>`;
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle('🎉 Sorteos activos')
          .setDescription(lines.join('\n'))],
        flags: 64,
      });
    }

    if (sub === 'eliminar') {
      const id = interaction.options.getInteger('id');
      const giveaway = await getGiveaway(id);

      if (!giveaway || giveaway.guildId !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Sorteo no encontrado.')], flags: 64 });
      }
      if (giveaway.ended) {
        return interaction.reply({ embeds: [errorEmbed('Este sorteo ya ha terminado.')], flags: 64 });
      }

      await updateGiveaway(id, { ended: true });

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);
      if (channel && giveaway.messageId) {
        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }

      return interaction.reply({ embeds: [successEmbed('Sorteo eliminado', `El sorteo **${giveaway.prize}** ha sido cancelado.`)], flags: 64 });
    }
  },
};
