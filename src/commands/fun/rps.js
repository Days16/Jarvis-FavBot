import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const OPCIONES = ['piedra', 'papel', 'tijeras'];
const EMOJI = { piedra: '🪨', papel: '📄', tijeras: '✂️' };

function getResult(jugador, bot) {
  if (jugador === bot) return 'empate';
  if (
    (jugador === 'piedra' && bot === 'tijeras') ||
    (jugador === 'papel' && bot === 'piedra') ||
    (jugador === 'tijeras' && bot === 'papel')
  ) return 'gana';
  return 'pierde';
}

export default {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Juega Piedra, Papel o Tijeras contra el bot ✂️')
    .addStringOption(o => o
      .setName('eleccion')
      .setDescription('Tu elección')
      .setRequired(true)
      .addChoices(
        { name: '🪨 Piedra', value: 'piedra' },
        { name: '📄 Papel', value: 'papel' },
        { name: '✂️ Tijeras', value: 'tijeras' },
      )),

  async execute(interaction) {
    const jugador = interaction.options.getString('eleccion');
    const bot = OPCIONES[Math.floor(Math.random() * 3)];
    const resultado = getResult(jugador, bot);

    const config = {
      gana:   { color: 0x57f287, titulo: '¡Ganaste! 🎉' },
      pierde: { color: 0xed4245, titulo: '¡Perdiste! 😔' },
      empate: { color: 0xfee75c, titulo: '¡Empate! 🤝' },
    }[resultado];

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.color)
        .setTitle(`✂️ Piedra, Papel o Tijeras — ${config.titulo}`)
        .addFields(
          { name: 'Tu elección', value: `${EMOJI[jugador]} ${jugador.charAt(0).toUpperCase() + jugador.slice(1)}`, inline: true },
          { name: 'Mi elección', value: `${EMOJI[bot]} ${bot.charAt(0).toUpperCase() + bot.slice(1)}`, inline: true },
        )],
    });
  },
};
