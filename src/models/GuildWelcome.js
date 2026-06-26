import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    welcomeChannelId: row.welcome_channel_id,
    welcomeMessage: row.welcome_message,
    welcomeImageEnabled: row.welcome_image_enabled,
    welcomeBgUrl: row.welcome_bg_url,
    welcomeDm: row.welcome_dm,
    goodbyeChannelId: row.goodbye_channel_id,
    goodbyeMessage: row.goodbye_message,
    verifyChannelId: row.verify_channel_id,
    verifyRoleId: row.verify_role_id,
    verifyMessage: row.verify_message,
    verifyPanelMsgId: row.verify_panel_msg_id,
  };
}

export async function getGuildWelcome(guildId) {
  const { data } = await supabase
    .from('guild_welcome')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();
  return normalize(data);
}

export async function ensureGuildWelcome(guildId) {
  const existing = await getGuildWelcome(guildId);
  if (existing) return existing;
  const { data } = await supabase
    .from('guild_welcome')
    .insert({ guild_id: guildId })
    .select()
    .single();
  return normalize(data);
}

export async function updateGuildWelcome(guildId, updates) {
  const snake = {};
  if ('welcomeChannelId' in updates) snake.welcome_channel_id = updates.welcomeChannelId;
  if ('welcomeMessage' in updates) snake.welcome_message = updates.welcomeMessage;
  if ('welcomeImageEnabled' in updates) snake.welcome_image_enabled = updates.welcomeImageEnabled;
  if ('welcomeBgUrl' in updates) snake.welcome_bg_url = updates.welcomeBgUrl;
  if ('welcomeDm' in updates) snake.welcome_dm = updates.welcomeDm;
  if ('goodbyeChannelId' in updates) snake.goodbye_channel_id = updates.goodbyeChannelId;
  if ('goodbyeMessage' in updates) snake.goodbye_message = updates.goodbyeMessage;
  if ('verifyChannelId' in updates) snake.verify_channel_id = updates.verifyChannelId;
  if ('verifyRoleId' in updates) snake.verify_role_id = updates.verifyRoleId;
  if ('verifyMessage' in updates) snake.verify_message = updates.verifyMessage;
  if ('verifyPanelMsgId' in updates) snake.verify_panel_msg_id = updates.verifyPanelMsgId;

  const { data } = await supabase
    .from('guild_welcome')
    .update(snake)
    .eq('guild_id', guildId)
    .select()
    .single();
  return normalize(data);
}
