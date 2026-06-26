import { supabase } from '../utils/database.js';

const DEFAULT_AUTOMOD = {
  enabled: false,
  antiflood:  { enabled: false, messages: 5, seconds: 3, timeoutMinutes: 5 },
  antiCaps:   { enabled: false, percentage: 70, minLength: 10 },
  antiInvite: { enabled: false, whitelist: [] },
  antiSpam:   { enabled: false, repeatCount: 3 },
  antiRaid:   { enabled: false, joinCount: 10, joinSeconds: 60 },
  antiDehoist: false,
  whitelist:  { roles: [], channels: [] },
};

function normalize(row) {
  if (!row) return null;
  return {
    guildId:        row.guild_id,
    prefix:         row.prefix         ?? '!',
    language:       row.language        ?? 'es',
    timezone:       row.timezone        ?? 'Europe/Madrid',
    modRoles:       row.mod_roles       ?? [],
    adminRoles:     row.admin_roles     ?? [],
    channels:       row.channels        ?? {},
    modules:        row.modules         ?? { moderation: true },
    automod:        { ...DEFAULT_AUTOMOD, ...(row.automod ?? {}) },
    warnThresholds: row.warn_thresholds ?? { timeout1h: 3, timeout24h: 5, ban: 7 },
  };
}

// Devuelve la config del servidor o null si no existe
export async function getGuild(guildId) {
  const { data } = await supabase
    .from('guilds').select('*').eq('guild_id', guildId).maybeSingle();
  return normalize(data);
}

// Inserta si no existe, devuelve el registro final
export async function ensureGuild(guildId) {
  await supabase
    .from('guilds')
    .upsert({ guild_id: guildId }, { onConflict: 'guild_id', ignoreDuplicates: true });
  return getGuild(guildId);
}

// Actualiza campos concretos (acepta claves camelCase)
export async function updateGuild(guildId, updates) {
  const MAP = {
    prefix: 'prefix', language: 'language', timezone: 'timezone',
    modRoles: 'mod_roles', adminRoles: 'admin_roles',
    channels: 'channels', modules: 'modules',
    automod: 'automod', warnThresholds: 'warn_thresholds',
  };
  const row = {};
  for (const [k, dbk] of Object.entries(MAP)) {
    if (k in updates) row[dbk] = updates[k];
  }
  const { data } = await supabase
    .from('guilds').update(row).eq('guild_id', guildId).select().maybeSingle();
  return normalize(data);
}
