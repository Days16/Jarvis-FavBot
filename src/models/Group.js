import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    ownerId: row.owner_id,
    channelId: row.channel_id,
    name: row.name,
    admins: row.admins ?? [],
    members: row.members ?? [],
    pending: row.pending ?? [],
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

export async function getGroupByChannel(channelId) {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('channel_id', channelId)
    .maybeSingle();
  return normalize(data);
}

export async function getGroupsByGuild(guildId) {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('guild_id', guildId)
    .order('created_at');
  return (data ?? []).map(normalize);
}

export async function getGroupByOwner(guildId, ownerId) {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('guild_id', guildId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  return normalize(data);
}

export async function createGroup({ guildId, ownerId, channelId, name, visibility = 'private' }) {
  const { data } = await supabase
    .from('groups')
    .insert({ guild_id: guildId, owner_id: ownerId, channel_id: channelId, name, members: [ownerId], visibility })
    .select()
    .single();
  return normalize(data);
}

export async function updateGroup(id, updates) {
  const snake = {};
  if ('name' in updates) snake.name = updates.name;
  if ('admins' in updates) snake.admins = updates.admins;
  if ('members' in updates) snake.members = updates.members;
  if ('pending' in updates) snake.pending = updates.pending;
  if ('visibility' in updates) snake.visibility = updates.visibility;
  if ('ownerId' in updates) snake.owner_id = updates.ownerId;

  const { data } = await supabase
    .from('groups')
    .update(snake)
    .eq('id', id)
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function deleteGroup(id) {
  await supabase.from('groups').delete().eq('id', id);
}
