import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    ownerId: row.owner_id,
    channelId: row.channel_id,
    name: row.name,
    members: row.members ?? [],
    renameCount: row.rename_count,
    lastRename: row.last_rename,
    lastActive: row.last_active,
    createdAt: row.created_at,
  };
}

export async function getPrivateChannelByChannel(channelId) {
  const { data } = await supabase
    .from('private_channels')
    .select('*')
    .eq('channel_id', channelId)
    .maybeSingle();
  return normalize(data);
}

export async function getPrivateChannelsByOwner(guildId, ownerId) {
  const { data } = await supabase
    .from('private_channels')
    .select('*')
    .eq('guild_id', guildId)
    .eq('owner_id', ownerId);
  return (data ?? []).map(normalize);
}

export async function countPrivateChannelsByOwner(guildId, ownerId) {
  const { count } = await supabase
    .from('private_channels')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .eq('owner_id', ownerId);
  return count ?? 0;
}

export async function createPrivateChannel({ guildId, ownerId, channelId, name }) {
  const { data } = await supabase
    .from('private_channels')
    .insert({ guild_id: guildId, owner_id: ownerId, channel_id: channelId, name, members: [ownerId] })
    .select()
    .single();
  return normalize(data);
}

export async function updatePrivateChannel(channelId, updates) {
  const snake = {};
  if ('name' in updates) snake.name = updates.name;
  if ('members' in updates) snake.members = updates.members;
  if ('renameCount' in updates) snake.rename_count = updates.renameCount;
  if ('lastRename' in updates) snake.last_rename = updates.lastRename;
  if ('lastActive' in updates) snake.last_active = updates.lastActive;

  const { data } = await supabase
    .from('private_channels')
    .update(snake)
    .eq('channel_id', channelId)
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function deletePrivateChannel(channelId) {
  await supabase.from('private_channels').delete().eq('channel_id', channelId);
}

export async function getInactivePrivateChannels(guildId, olderThanDays = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const { data } = await supabase
    .from('private_channels')
    .select('*')
    .eq('guild_id', guildId)
    .lt('last_active', cutoff.toISOString());
  return (data ?? []).map(normalize);
}
