const floodMap = new Map();

export async function checkAutomod(message, guildData) {
  if (!guildData?.automod?.enabled) return null;
  if (message.author.bot) return null;

  const { member, guild, channel, content } = message;
  if (!member) return null;
  if (member.permissions.has('Administrator')) return null;

  const { automod } = guildData;

  if (automod.whitelist?.channels?.includes(channel.id)) return null;
  if (member.roles.cache.some(r => automod.whitelist?.roles?.includes(r.id))) return null;

  // Anti-dehoist: se aplica al nick, no bloquea el mensaje
  if (automod.antiDehoist) {
    const dehoistRe = /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
    if (member.displayName && dehoistRe.test(member.displayName)) {
      await member.setNickname(`Moderado ${member.id.slice(-4)}`, 'Automod: anti-dehoist').catch(() => {});
    }
  }

  // Anti-caps
  if (automod.antiCaps?.enabled && content.length > (automod.antiCaps.minLength ?? 10)) {
    const letters = content.match(/[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g) ?? [];
    const upper   = content.match(/[A-ZÁÉÍÓÚÜÑ]/g) ?? [];
    if (letters.length > 0 && (upper.length / letters.length) * 100 > (automod.antiCaps.percentage ?? 70)) {
      await message.delete().catch(() => {});
      return { rule: 'anticaps', reply: '⚠️ No uses tantas mayúsculas.' };
    }
  }

  // Anti-invite
  if (automod.antiInvite?.enabled) {
    const inviteRe = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([A-Za-z0-9\-]+)/gi;
    if (inviteRe.test(content)) {
      await message.delete().catch(() => {});
      return { rule: 'antiinvite', reply: '🚫 No se permiten invitaciones de Discord.', warn: true };
    }
  }

  // Anti-spam (texto idéntico repetido)
  if (automod.antiSpam?.enabled) {
    const emojiCount = (content.match(/<a?:[^:]+:\d+>|[\u{1F300}-\u{1FAD6}]/gu) ?? []).length;
    if (emojiCount > 10) {
      await message.delete().catch(() => {});
      return { rule: 'antispam', reply: '🚫 Demasiados emojis en un mensaje.' };
    }

    const recent = await channel.messages.fetch({ limit: (automod.antiSpam.repeatCount ?? 3) + 1 }).catch(() => null);
    if (recent) {
      const userMsgs = [...recent.values()].filter(m => m.author.id === message.author.id && m.content === content);
      if (userMsgs.length >= (automod.antiSpam.repeatCount ?? 3)) {
        await message.delete().catch(() => {});
        return { rule: 'antispam', reply: '🚫 No repitas el mismo mensaje.', warn: true };
      }
    }
  }

  // Anti-flood
  if (automod.antiflood?.enabled) {
    const key = `${message.author.id}-${guild.id}`;
    const now  = Date.now();
    const data = floodMap.get(key) ?? { count: 0, since: now };

    if (now - data.since < (automod.antiflood.seconds ?? 3) * 1000) {
      data.count++;
      if (data.count >= (automod.antiflood.messages ?? 5)) {
        floodMap.delete(key);
        return {
          rule: 'antiflood',
          reply: '🚫 Estás enviando mensajes demasiado rápido.',
          timeout: (automod.antiflood.timeoutMinutes ?? 5) * 60 * 1000,
        };
      }
      floodMap.set(key, data);
    } else {
      floodMap.set(key, { count: 1, since: now });
    }
  }

  return null;
}

const raidMap = new Map();

export function checkAntiRaid(guild, guildData) {
  if (!guildData?.automod?.antiRaid?.enabled) return false;
  const { joinCount = 10, joinSeconds = 60 } = guildData.automod.antiRaid;

  const now  = Date.now();
  const data = raidMap.get(guild.id) ?? { count: 0, since: now };

  if (now - data.since < joinSeconds * 1000) {
    data.count++;
    raidMap.set(guild.id, data);
    return data.count >= joinCount;
  } else {
    raidMap.set(guild.id, { count: 1, since: now });
    return false;
  }
}
