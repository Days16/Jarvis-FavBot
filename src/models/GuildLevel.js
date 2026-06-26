import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    xp: row.xp,
    level: row.level,
    lastXpAt: row.last_xp_at,
  };
}

export async function getLevel(guildId, userId) {
  const { data } = await supabase
    .from('guild_levels')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();
  return normalize(data);
}

export async function ensureLevel(guildId, userId) {
  const existing = await getLevel(guildId, userId);
  if (existing) return existing;
  const { data } = await supabase
    .from('guild_levels')
    .insert({ guild_id: guildId, user_id: userId })
    .select()
    .single();
  return normalize(data);
}

export async function updateLevel(guildId, userId, updates) {
  const snake = {};
  if ('xp'      in updates) snake.xp         = updates.xp;
  if ('level'   in updates) snake.level       = updates.level;
  if ('lastXpAt' in updates) snake.last_xp_at = updates.lastXpAt;
  const { data } = await supabase
    .from('guild_levels')
    .update(snake)
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .select()
    .single();
  return normalize(data);
}

export async function getLeaderboard(guildId, limit = 10) {
  const { data } = await supabase
    .from('guild_levels')
    .select('*')
    .eq('guild_id', guildId)
    .order('xp', { ascending: false })
    .limit(limit);
  return (data ?? []).map(normalize);
}

export async function getRank(guildId, userId) {
  const entry = await getLevel(guildId, userId);
  if (!entry) return null;
  const { count } = await supabase
    .from('guild_levels')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .gt('xp', entry.xp);
  return { ...entry, rank: (count ?? 0) + 1 };
}

export async function resetLevel(guildId, userId) {
  await supabase
    .from('guild_levels')
    .update({ xp: 0, level: 0, last_xp_at: null })
    .eq('guild_id', guildId)
    .eq('user_id', userId);
}
