import { EmbedBuilder } from 'discord.js';
import { sendModLog } from '../utils/modLogger.js';

export default {
  name: 'guildBanAdd',
  async execute(ban) {
    // Intentar obtener la razón del audit log
    let reason = 'Sin razón';
    let moderator = 'Desconocido';

    try {
      await new Promise(r => setTimeout(r, 500)); // Pequeño delay para que el audit log se actualice
      const audit = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }); // 22 = MEMBER_BAN_ADD
      const entry = audit.entries.first();
      if (entry && entry.target?.id === ban.user.id) {
        reason = entry.reason ?? 'Sin razón';
        moderator = entry.executor ? `${entry.executor.tag} (\`${entry.executor.id}\`)` : 'Desconocido';
      }
    } catch { }

    await sendModLog(ban.guild, {
      action: '🔨 Usuario baneado (externo)',
      color: 0xED4245,
      fields: [
        ['Usuario', `${ban.user.tag} (\`${ban.user.id}\`)`, true],
        ['Moderador', moderator, true],
        ['Razón', reason, false],
      ],
    });
  },
};
