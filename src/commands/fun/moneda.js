import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('moneda')
    .setDescription('Lanza una moneda al aire 🪙'),

  async execute(interaction) {
    const cara = Math.random() < 0.5;
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(cara ? 0xfee75c : 0x99aab5)
        .setTitle('🪙 Lanzamiento de moneda')
        .setDescription(cara ? '## Cara 👑' : '## Cruz ⚜️')
        .setFooter({ text: `Lanzado por ${interaction.user.tag}` })],
    });
  },
};
