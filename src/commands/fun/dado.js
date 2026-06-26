import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('dado')
    .setDescription('Lanza uno o varios dados 🎲')
    .addIntegerOption(o => o.setName('caras').setDescription('Número de caras del dado (por defecto 6)').setMinValue(2).setMaxValue(10000))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cuántos dados lanzar (máx. 20, por defecto 1)').setMinValue(1).setMaxValue(20)),

  async execute(interaction) {
    const caras = interaction.options.getInteger('caras') ?? 6;
    const cantidad = interaction.options.getInteger('cantidad') ?? 1;

    const resultados = Array.from({ length: cantidad }, () => Math.floor(Math.random() * caras) + 1);
    const total = resultados.reduce((a, b) => a + b, 0);

    const desc = cantidad === 1
      ? `Obtuviste un **${resultados[0]}**`
      : `Resultados: ${resultados.map(r => `\`${r}\``).join(' + ')} = **${total}**`;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🎲 Dado${cantidad > 1 ? 's' : ''} D${caras}`)
        .setDescription(desc)
        .setFooter({ text: `${cantidad} dado${cantidad > 1 ? 's' : ''} de ${caras} caras` })],
    });
  },
};
