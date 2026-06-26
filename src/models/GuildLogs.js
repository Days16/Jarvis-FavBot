import { supabase } from '../utils/database.js';

// channels y enabled son JSONB: { messages, members, mod, roles, channels, voice, invites, guild, bot }

export async function getGuildLogs(guildId) {
  const { data } = await supabase
    .from('guild_logs').select('*').eq('guild_id', guildId).maybeSingle();
  if (!data) return null;
  return {
    guildId:  data.guild_id,
    channels: data.channels ?? {},
    enabled:  data.enabled  ?? {},
  };
}

export async function ensureGuildLogs(guildId) {
  await supabase
    .from('guild_logs')
    .upsert({ guild_id: guildId }, { onConflict: 'guild_id', ignoreDuplicates: true });
  return getGuildLogs(guildId);
}

export async function updateGuildLogs(guildId, updates) {
  const { data } = await supabase
    .from('guild_logs').update(updates).eq('guild_id', guildId)
    .select().maybeSingle();
  if (!data) return null;
  return { guildId: data.guild_id, channels: data.channels ?? {}, enabled: data.enabled ?? {} };
}
