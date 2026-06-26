import { getGuildLogs } from '../models/GuildLogs.js';
import { EmbedBuilder } from 'discord.js';

export async function sendModLog(guild, { action, color, fields }) {
  try {
    const logs = await getGuildLogs(guild.id);
    if (!logs?.enabled?.mod || !logs?.channels?.mod) return;

    const channel = guild.channels.cache.get(logs.channels.mod);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(color ?? 0xFF8C00)
      .setTitle(action)
      .setTimestamp()
      .setFooter({ text: `MOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}` });

    for (const [name, value, inline = false] of fields) {
      embed.addFields({ name, value: String(value || 'N/A'), inline });
    }

    await channel.send({ embeds: [embed] });
  } catch { }
}

export async function sendMemberLog(guild, embed) {
  try {
    const logs = await getGuildLogs(guild.id);
    if (!logs?.enabled?.members || !logs?.channels?.members) return;
    const channel = guild.channels.cache.get(logs.channels.members);
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
  } catch { }
}
