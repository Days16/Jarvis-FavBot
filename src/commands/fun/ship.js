import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

function shipBar(pct, len = 20) {
  const filled = Math.round((pct / 100) * len);
  return '💗'.repeat(filled) + '🖤'.repeat(len - filled);
}

function shipLabel(pct) {
  if (pct >= 90) return '💘 ¡Alma gemela! ¡Perfectos el uno para el otro!';
  if (pct >= 75) return '❤️ ¡Gran compatibilidad! Hay mucha química.';
  if (pct >= 60) return '🧡 Buena pareja. Con esfuerzo puede ser algo grande.';
  if (pct >= 45) return '💛 Compatibilidad media. Pueden llevarse bien.';
  if (pct >= 30) return '💚 Algo hay, pero les costará.';
  if (pct >= 15) return '💙 Muy poca compatibilidad...';
  return '🖤 Esto no va a funcionar. ¡Ni lo intentes!';
}

function deterministicShip(id1, id2) {
  const combined = [...(id1 + id2)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return combined % 101; // 0–100
}

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calcula la compatibilidad entre dos usuarios 💕')
    .addUserOption(o => o.setName('usuario1').setDescription('Primer usuario').setRequired(true))
    .addUserOption(o => o.setName('usuario2').setDescription('Segundo usuario').setRequired(false)),

  async execute(interaction) {
    const u1 = interaction.options.getUser('usuario1');
    const u2 = interaction.options.getUser('usuario2') ?? interaction.user;

    // Siempre ordenar IDs para que el resultado sea igual sin importar el orden
    const [idA, idB] = [u1.id, u2.id].sort();
    const pct = deterministicShip(idA, idB);
    const nombre = `${u1.username.slice(0, 4)}${u2.username.slice(-4)}`;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('💕 Ship Meter')
        .addFields(
          { name: '👫 Pareja', value: `${u1} & ${u2}`, inline: false },
          { name: '🏷️ Nombre del ship', value: `**${nombre}**`, inline: true },
          { name: '💯 Compatibilidad', value: `**${pct}%**`, inline: true },
        )
        .setDescription(`${shipBar(pct)}\n\n${shipLabel(pct)}`)],
    });
  },
};
