import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    warnId:      row.warn_id,
    userId:      row.user_id,
    guildId:     row.guild_id,
    moderatorId: row.moderator_id,
    reason:      row.reason,
    active:      row.active,
    createdAt:   row.created_at,
  };
}

export async function createWarn(guildId, userId, moderatorId, reason) {
  const warnId = 'WARN-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('warns')
    .insert({ warn_id: warnId, user_id: userId, guild_id: guildId, moderator_id: moderatorId, reason })
    .select().single();
  if (error) throw error;
  return normalize(data);
}

export async function deactivateWarn(warnId, guildId) {
  const { data } = await supabase
    .from('warns')
    .update({ active: false })
    .eq('warn_id', warnId).eq('guild_id', guildId)
    .select().maybeSingle();
  return normalize(data);
}

export async function countActiveWarns(userId, guildId) {
  const { count } = await supabase
    .from('warns').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('guild_id', guildId).eq('active', true);
  return count ?? 0;
}

export async function getActiveWarns(userId, guildId) {
  const { data } = await supabase
    .from('warns').select('*')
    .eq('user_id', userId).eq('guild_id', guildId).eq('active', true)
    .order('created_at', { ascending: false });
  return (data ?? []).map(normalize);
}
