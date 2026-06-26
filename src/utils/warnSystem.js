import { createWarn, countActiveWarns, deactivateWarn, getActiveWarns } from '../models/Warn.js';
import { getGuild } from '../models/Guild.js';

export async function addWarn(guild, userId, moderatorId, reason) {
  const warn = await createWarn(guild.id, userId, moderatorId, reason);
  const totalActive = await countActiveWarns(userId, guild.id);

  const guildData = await getGuild(guild.id);
  const t = guildData?.warnThresholds ?? { timeout1h: 3, timeout24h: 5, ban: 7 };

  let autoAction = null;
  if (totalActive >= t.ban) {
    autoAction = { type: 'ban' };
  } else if (totalActive >= t.timeout24h) {
    autoAction = { type: 'timeout', durationMs: 24 * 60 * 60 * 1000, label: '24 horas' };
  } else if (totalActive >= t.timeout1h) {
    autoAction = { type: 'timeout', durationMs: 60 * 60 * 1000, label: '1 hora' };
  }

  return { warnId: warn.warnId, totalActive, autoAction };
}

export async function removeWarn(warnId, guildId) {
  return deactivateWarn(warnId, guildId);
}

export { getActiveWarns };
