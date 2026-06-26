import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes del canal (máx 100, últimos 14 días)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('cantidad').setDescription('Número de mensajes a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('usuario').setDescription('Filtrar mensajes de un usuario específico')),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const amount  = interaction.options.getInteger('cantidad');
    const target  = interaction.options.getUser('usuario');
    const channel = interaction.channel;

    // Obtener mensajes (fetching más si hay filtro de usuario)
    const fetched = await channel.messages.fetch({ limit: target ? 100 : amount });
    const twoWeeks = Date.now() - 13 * 24 * 60 * 60 * 1000;

    let toDelete = [...fetched.values()].filter(m => m.createdTimestamp > twoWeeks);
    if (target) toDelete = toDelete.filter(m => m.author.id === target.id).slice(0, amount);

    if (!toDelete.length) {
      return interaction.editReply({ embeds: [errorEmbed('No hay mensajes eliminables (deben tener menos de 14 días).')] });
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    await interaction.editReply({
      embeds: [successEmbed('Mensajes eliminados', `Se borraron **${deleted.size}** mensaje(s)${target ? ` de **${target.tag}**` : ''}.`)],
    });
  },
};
