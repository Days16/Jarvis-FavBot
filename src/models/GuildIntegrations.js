import { supabase } from '../utils/database.js';

export const INTEGRATION_TYPES = ['twitch', 'youtube', 'kick', 'tiktok', 'github', 'rss', 'reddit', 'steam'];

export const INTEGRATION_LABELS = {
  twitch:  'Twitch',
  youtube: 'YouTube',
  kick:    'Kick',
  tiktok:  'TikTok',
  github:  'GitHub',
  rss:     'RSS',
  reddit:  'Reddit',
  steam:   'Steam',
};

function normalize(row) {
  if (!row) return null;
  return {
    id:             row.id,
    guildId:        row.guild_id,
    type:           row.type,
    name:           row.name,
    target:         row.target,
    alertChannelId: row.alert_channel_id,
    pingRoleId:     row.ping_role_id,
    customMessage:  row.custom_message,
    enabled:        row.enabled,
    lastCheckedAt:  row.last_checked_at,
    lastContentId:  row.last_content_id,
    metadata:       row.metadata ?? {},
    createdAt:      row.created_at,
  };
}

// Obtiene todas las integraciones de un servidor
export async function getGuildIntegrations(guildId, type = null) {
  let q = supabase.from('guild_integrations').select('*').eq('guild_id', guildId);
  if (type) q = q.eq('type', type);
  const { data } = await q.order('created_at', { ascending: true });
  return (data ?? []).map(normalize);
}

// Obtiene todas las integraciones activas de un tipo (para el poller global)
export async function getActiveIntegrationsByType(type) {
  const { data } = await supabase
    .from('guild_integrations').select('*')
    .eq('type', type).eq('enabled', true);
  return (data ?? []).map(normalize);
}

// Crea una nueva integración en un servidor
export async function createIntegration(guildId, { type, name, target, alertChannelId, pingRoleId, customMessage, metadata }) {
  const { data, error } = await supabase
    .from('guild_integrations')
    .insert({
      guild_id:        guildId,
      type,
      name,
      target,
      alert_channel_id: alertChannelId ?? null,
      ping_role_id:     pingRoleId     ?? null,
      custom_message:   customMessage  ?? null,
      metadata:         metadata        ?? {},
    })
    .select().single();
  if (error) throw error;
  return normalize(data);
}

// Actualiza una integración existente
export async function updateIntegration(id, guildId, updates) {
  const MAP = {
    name: 'name', target: 'target',
    alertChannelId: 'alert_channel_id', pingRoleId: 'ping_role_id',
    customMessage: 'custom_message', enabled: 'enabled', metadata: 'metadata',
  };
  const row = {};
  for (const [k, dbk] of Object.entries(MAP)) {
    if (k in updates) row[dbk] = updates[k];
  }
  const { data } = await supabase
    .from('guild_integrations').update(row)
    .eq('id', id).eq('guild_id', guildId)
    .select().maybeSingle();
  return normalize(data);
}

// Actualiza el último contenido procesado (usado por el poller)
export async function markChecked(id, lastContentId = null) {
  await supabase
    .from('guild_integrations')
    .update({ last_checked_at: new Date().toISOString(), last_content_id: lastContentId })
    .eq('id', id);
}

// Elimina una integración
export async function deleteIntegration(id, guildId) {
  const { error } = await supabase
    .from('guild_integrations').delete()
    .eq('id', id).eq('guild_id', guildId);
  return !error;
}
