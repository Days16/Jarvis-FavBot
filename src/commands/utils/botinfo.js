import { SlashCommandBuilder, EmbedBuilder, version as djsVersion } from 'discord.js';
import { COLORS } from '../../utils/embedBuilder.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'), 'utf8'));

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Información y estadísticas del bot'),

  async execute(interaction) {
    const client = interaction.client;
    const users  = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`${client.user.username} — Información`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '🤖 Versión', value: `v${pkg.version}`, inline: true },
        { name: '📡 Latencia', value: `${client.ws.ping}ms`, inline: true },
        { name: '⏱ Uptime', value: formatUptime(client.uptime), inline: true },
        { name: '🏠 Servidores', value: String(client.guilds.cache.size), inline: true },
        { name: '👥 Usuarios', value: String(users), inline: true },
        { name: '⚙️ Node.js', value: process.version, inline: true },
        { name: '📦 Discord.js', value: `v${djsVersion}`, inline: true },
        { name: '🧠 RAM', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
        { name: '👨‍💻 Autor', value: pkg.author, inline: true },
      )
      .setFooter({ text: pkg.description })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
