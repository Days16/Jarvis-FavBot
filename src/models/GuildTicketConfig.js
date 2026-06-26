import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    panelChannelId: row.panel_channel_id,
    panelMessageId: row.panel_message_id,
    logChannelId: row.log_channel_id,
    staffRoleId: row.staff_role_id,
    escalationRoleId: row.escalation_role_id,
    categoryId: row.category_id,
    autocloseHours: row.autoclose_hours,
    categories: row.categories ?? [],
    ticketCount: row.ticket_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTicketConfig(guildId) {
  const { data } = await supabase
    .from('guild_ticket_config')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();
  return normalize(data);
}

export async function ensureTicketConfig(guildId) {
  const existing = await getTicketConfig(guildId);
  if (existing) return existing;
  const { data } = await supabase
    .from('guild_ticket_config')
    .insert({ guild_id: guildId })
    .select()
    .single();
  return normalize(data);
}

export async function updateTicketConfig(guildId, updates) {
  const snake = {};
  if ('panelChannelId' in updates) snake.panel_channel_id = updates.panelChannelId;
  if ('panelMessageId' in updates) snake.panel_message_id = updates.panelMessageId;
  if ('logChannelId' in updates) snake.log_channel_id = updates.logChannelId;
  if ('staffRoleId' in updates) snake.staff_role_id = updates.staffRoleId;
  if ('escalationRoleId' in updates) snake.escalation_role_id = updates.escalationRoleId;
  if ('categoryId' in updates) snake.category_id = updates.categoryId;
  if ('autocloseHours' in updates) snake.autoclose_hours = updates.autocloseHours;
  if ('categories' in updates) snake.categories = updates.categories;
  if ('ticketCount' in updates) snake.ticket_count = updates.ticketCount;

  const { data } = await supabase
    .from('guild_ticket_config')
    .update(snake)
    .eq('guild_id', guildId)
    .select()
    .single();
  return normalize(data);
}

export async function incrementTicketCount(guildId) {
  const cfg = await ensureTicketConfig(guildId);
  const newCount = cfg.ticketCount + 1;
  await updateTicketConfig(guildId, { ticketCount: newCount });
  return newCount;
}
