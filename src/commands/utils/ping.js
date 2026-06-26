import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embedBuilder.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Muestra la latencia del bot y de la API de Discord'),

  async execute(interaction) {
    const { resource } = await interaction.reply({ content: '🏓 Calculando...', withResponse: true });
    const sent = resource.message;
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;

    const embed = infoEmbed(
      '🏓 Pong!',
      `**Roundtrip:** \`${roundtrip}ms\`\n**WebSocket:** \`${ws}ms\``
    );
    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
