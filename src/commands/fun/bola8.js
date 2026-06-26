import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const RESPUESTAS = [
  // Positivas
  '🔵 Sí, definitivamente.',
  '🔵 Por supuesto que sí.',
  '🔵 Sin lugar a dudas.',
  '🔵 Puedes contar con ello.',
  '🔵 La respuesta es afirmativa.',
  '🔵 Absolutamente sí.',
  '🟢 Las perspectivas son muy favorables.',
  '🟢 Mis señales apuntan a que sí.',
  '🟢 Todo indica que así será.',
  // Neutras
  '⚪ Respuesta incierta, vuelve a intentarlo.',
  '⚪ Pregunta de nuevo más tarde.',
  '⚪ Ahora no puedo predecirlo.',
  '⚪ Concéntrate y pregunta de nuevo.',
  '⚪ No lo tengo claro en este momento.',
  // Negativas
  '🔴 No lo creo.',
  '🔴 Mis fuentes dicen que no.',
  '🔴 Las perspectivas no son buenas.',
  '🔴 Muy dudoso.',
  '🔴 No cuentes con ello.',
  '🔴 La respuesta es negativa.',
];

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('bola8')
    .setDescription('Consulta la bola mágica del 8 🎱')
    .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta para la bola mágica').setRequired(true)),

  async execute(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('🎱 Bola Mágica del 8')
        .addFields(
          { name: '❓ Pregunta', value: pregunta },
          { name: '✨ Respuesta', value: respuesta },
        )
        .setFooter({ text: `Consultado por ${interaction.user.tag}` })],
    });
  },
};
