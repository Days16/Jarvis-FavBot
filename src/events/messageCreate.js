import { getGuild } from '../models/Guild.js';
import { checkAutomod } from '../utils/automod.js';
import { addWarn } from '../utils/warnSystem.js';
import { sendModLog } from '../utils/modLogger.js';
import { processXp } from '../utils/levelManager.js';
import { askAI } from '../utils/aiManager.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    processXp(message).catch(() => {});

    const guildData = await getGuild(message.guild.id).catch(() => null);

    // ── Canal de IA ───────────────────────────────────────────────
    const aiChannelId = guildData?.channels?.ai;
    if (aiChannelId && message.channel.id === aiChannelId && message.content.length > 1 && !message.content.startsWith('/')) {
      message.channel.sendTyping().catch(() => {});
      askAI(message.content, message.channel.id)
        .then(reply => message.reply({ content: reply.slice(0, 2000) }))
        .catch(() => {});
    }

    const result = await checkAutomod(message, guildData);
    if (!result) return;

    if (result.reply) {
      const reply = await message.channel.send(`${message.author} ${result.reply}`).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
    }

    if (result.timeout && message.member) {
      await message.member.timeout(result.timeout, `Automod: ${result.rule}`).catch(() => {});
      await sendModLog(message.guild, {
        action: '🤖 Automod — Timeout',
        color: 0xFEE75C,
        fields: [
          ['Usuario', `${message.author.tag} (\`${message.author.id}\`)`, true],
          ['Regla', result.rule, true],
          ['Duración', `${result.timeout / 60000} min`, true],
        ],
      });
    }

    if (result.warn && message.member) {
      const { warnId, totalActive, autoAction } = await addWarn(
        message.guild, message.author.id, message.client.user.id, `Automod: ${result.rule}`
      );
      await sendModLog(message.guild, {
        action: '🤖 Automod — Advertencia',
        color: 0xFEE75C,
        fields: [
          ['Usuario', `${message.author.tag} (\`${message.author.id}\`)`, true],
          ['Regla', result.rule, true],
          ['ID Warn', warnId, true],
          ['Total warns', String(totalActive), true],
        ],
      });
      if (autoAction?.type === 'timeout') {
        await message.member.timeout(autoAction.durationMs, `Automod: umbral warns`).catch(() => {});
      } else if (autoAction?.type === 'ban') {
        await message.member.ban({ reason: `Automod: umbral de warns alcanzado (${totalActive})` }).catch(() => {});
      }
    }
  },
};
