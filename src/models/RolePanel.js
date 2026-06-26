import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    title: row.title,
    description: row.description,
    mode: row.mode,
    panelType: row.panel_type,
    requireRole: row.require_role,
    entries: row.entries ?? [],
    createdAt: row.created_at,
  };
}

export async function getRolePanelsByGuild(guildId) {
  const { data } = await supabase
    .from('role_panels')
    .select('*')
    .eq('guild_id', guildId)
    .order('created_at');
  return (data ?? []).map(normalize);
}

export async function getRolePanelById(id) {
  const { data } = await supabase
    .from('role_panels')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return normalize(data);
}

export async function getRolePanelByMessage(messageId) {
  const { data } = await supabase
    .from('role_panels')
    .select('*')
    .eq('message_id', messageId)
    .maybeSingle();
  return normalize(data);
}

export async function createRolePanel({ guildId, channelId, title, description }) {
  const { data } = await supabase
    .from('role_panels')
    .insert({ guild_id: guildId, channel_id: channelId, title: title ?? '🎭 Elige tu rol', description: description ?? 'Pulsa un botón para obtener o quitar un rol.' })
    .select()
    .single();
  return normalize(data);
}

export async function updateRolePanel(id, updates) {
  const snake = {};
  if ('messageId' in updates) snake.message_id = updates.messageId;
  if ('title' in updates) snake.title = updates.title;
  if ('description' in updates) snake.description = updates.description;
  if ('mode' in updates) snake.mode = updates.mode;
  if ('panelType' in updates) snake.panel_type = updates.panelType;
  if ('requireRole' in updates) snake.require_role = updates.requireRole;
  if ('entries' in updates) snake.entries = updates.entries;

  const { data } = await supabase
    .from('role_panels')
    .update(snake)
    .eq('id', id)
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function deleteRolePanel(id) {
  await supabase.from('role_panels').delete().eq('id', id);
}
