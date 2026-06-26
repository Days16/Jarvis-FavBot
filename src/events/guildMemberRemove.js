import { EmbedBuilder } from 'discord.js';
import { getGuildWelcome } from '../models/GuildWelcome.js';
import { sendMemberLog } from '../utils/modLogger.js';
import { applyVariables } from '../utils/welcomeVariables.js';

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    const { guild } = member;

    // ── Mod log: salida ────────────────────────────────────
    const modEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('📤 Miembro salió')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields([
        { name: 'Usuario', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: 'Se unió', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconocido', inline: true },
        { name: 'Miembros', value: String(guild.memberCount), inline: true },
      ])
      .setTimestamp();
    await sendMemberLog(guild, modEmbed);

    // ── Goodbye message ────────────────────────────────────
    const welcomeCfg = await getGuildWelcome(guild.id).catch(() => null);
    if (!welcomeCfg?.goodbyeChannelId) return;

    const goodbyeChannel = guild.channels.cache.get(welcomeCfg.goodbyeChannelId);
    if (!goodbyeChannel?.isTextBased()) return;

    const text = applyVariables(welcomeCfg.goodbyeMessage, member);
    await goodbyeChannel.send(text).catch(() => {});
  },
};
