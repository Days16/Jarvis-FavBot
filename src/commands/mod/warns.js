import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, errorEmbed } from '../../utils/embedBuilder.js';
import { getActiveWarns } from '../../utils/warnSystem.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Lista las advertencias activas de un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('usuario');

    const warns = await getActiveWarns(target.id, interaction.guild.id);
    if (!warns.length) {
      return interaction.editReply({ embeds: [errorEmbed(`**${target.tag}** no tiene advertencias activas.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`⚠️ Advertencias de ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`**Total activas:** ${warns.length}`)
      .setTimestamp();

    for (const warn of warns.slice(0, 10)) {
      const mod = await interaction.client.users.fetch(warn.moderatorId).catch(() => null);
      embed.addFields({
        name: `\`${warn.warnId}\` — ${warn.reason}`,
        value: `**Moderador:** ${mod?.tag ?? 'Desconocido'} | **Fecha:** <t:${Math.floor(new Date(warn.createdAt).getTime() / 1000)}:R>`,
      });
    }

    if (warns.length > 10) embed.setFooter({ text: `Mostrando 10 de ${warns.length} advertencias` });

    await interaction.editReply({ embeds: [embed] });
  },
};
