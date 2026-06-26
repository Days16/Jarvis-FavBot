import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    roleId: row.role_id,
    forBots: row.for_bots,
    delaySecs: row.delay_secs,
    createdAt: row.created_at,
  };
}

export async function getAutoroles(guildId) {
  const { data } = await supabase
    .from('guild_autoroles')
    .select('*')
    .eq('guild_id', guildId)
    .order('created_at');
  return (data ?? []).map(normalize);
}

export async function addAutorole(guildId, roleId, forBots = false, delaySecs = 0) {
  const { data, error } = await supabase
    .from('guild_autoroles')
    .insert({ guild_id: guildId, role_id: roleId, for_bots: forBots, delay_secs: delaySecs })
    .select()
    .single();
  if (error?.code === '23505') return null; // unique conflict
  return normalize(data);
}

export async function removeAutorole(guildId, roleId) {
  const { data } = await supabase
    .from('guild_autoroles')
    .delete()
    .eq('guild_id', guildId)
    .eq('role_id', roleId)
    .select()
    .maybeSingle();
  return normalize(data);
}
