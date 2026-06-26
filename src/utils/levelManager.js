import { EmbedBuilder } from 'discord.js';
import { ensureLevel, updateLevel } from '../models/GuildLevel.js';
import { getLevelConfig } from '../models/GuildLevelConfig.js';

// XP necesario para pasar del nivel n al n+1
export function xpForLevelUp(level) {
  return Math.floor(100 + level * 50 + level * level * 5);
}

// Calcula nivel y XP actual a partir del XP total acumulado
export function calcLevel(totalXp) {
  let level = 0;
  let xp = totalXp;
  let xpNeeded = xpForLevelUp(0);
  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    xpNeeded = xpForLevelUp(level);
  }
  return { level, currentXp: xp, xpNeeded };
}

// XP total acumulado para llegar a un nivel concreto
export function totalXpForLevel(targetLevel) {
  let total = 0;
  for (let i = 0; i < targetLevel; i++) total += xpForLevelUp(i);
  return total;
}

export async function processXp(message) {
  if (message.author.bot || !message.guild) return;

  const cfg = await getLevelConfig(message.guild.id);
  if (!cfg || !cfg.enabled) return;

  if (cfg.noXpChannels.includes(message.channel.id)) return;

  const member = message.member;
  if (!member) return;
  if (cfg.noXpRoles.some(r => member.roles.cache.has(r))) return;

  const entry = await ensureLevel(message.guild.id, message.author.id);

  if (entry.lastXpAt) {
    const elapsed = (Date.now() - new Date(entry.lastXpAt).getTime()) / 1000;
    if (elapsed < cfg.xpCooldown) return;
  }

  const gained = Math.round(
    (Math.random() * (cfg.xpMax - cfg.xpMin) + cfg.xpMin) * cfg.multiplier
  );

  const newTotalXp = entry.xp + gained;
  const before = calcLevel(entry.xp);
  const after = calcLevel(newTotalXp);

  await updateLevel(message.guild.id, message.author.id, {
    xp: newTotalXp,
    level: after.level,
    lastXpAt: new Date().toISOString(),
  });

  if (after.level > before.level) {
    await handleLevelUp(message, after.level, cfg);
  }
}

async function handleLevelUp(message, newLevel, cfg) {
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setDescription(`🎉 ${message.author} ¡has subido al **nivel ${newLevel}**!`)
    .setThumbnail(message.author.displayAvatarURL());

  const target = cfg.channelId
    ? message.guild.channels.cache.get(cfg.channelId)
    : message.channel;

  if (target?.isTextBased()) {
    await target.send({ embeds: [embed] }).catch(() => {});
  }

  const rewards = cfg.roleRewards.filter(r => r.level === newLevel);
  for (const reward of rewards) {
    const role = message.guild.roles.cache.get(reward.role_id);
    if (role && message.member && !message.member.roles.cache.has(role.id)) {
      await message.member.roles.add(role).catch(() => {});
    }
  }
}
