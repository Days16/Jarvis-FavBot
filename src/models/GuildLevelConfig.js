import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    enabled: row.enabled,
    channelId: row.channel_id,
    xpMin: row.xp_min,
    xpMax: row.xp_max,
    xpCooldown: row.xp_cooldown,
    multiplier: row.multiplier,
    noXpRoles: row.no_xp_roles ?? [],
    noXpChannels: row.no_xp_channels ?? [],
    roleRewards: row.role_rewards ?? [],
  };
}

export async function getLevelConfig(guildId) {
  const { data } = await supabase
    .from('guild_level_config')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();
  return normalize(data);
}

export async function ensureLevelConfig(guildId) {
  const existing = await getLevelConfig(guildId);
  if (existing) return existing;
  const { data } = await supabase
    .from('guild_level_config')
    .insert({ guild_id: guildId })
    .select()
    .single();
  return normalize(data);
}

export async function updateLevelConfig(guildId, updates) {
  const snake = {};
  if ('enabled'       in updates) snake.enabled         = updates.enabled;
  if ('channelId'     in updates) snake.channel_id      = updates.channelId;
  if ('xpMin'         in updates) snake.xp_min          = updates.xpMin;
  if ('xpMax'         in updates) snake.xp_max          = updates.xpMax;
  if ('xpCooldown'    in updates) snake.xp_cooldown     = updates.xpCooldown;
  if ('multiplier'    in updates) snake.multiplier       = updates.multiplier;
  if ('noXpRoles'     in updates) snake.no_xp_roles     = updates.noXpRoles;
  if ('noXpChannels'  in updates) snake.no_xp_channels  = updates.noXpChannels;
  if ('roleRewards'   in updates) snake.role_rewards     = updates.roleRewards;
  const { data } = await supabase
    .from('guild_level_config')
    .update(snake)
    .eq('guild_id', guildId)
    .select()
    .single();
  return normalize(data);
}
