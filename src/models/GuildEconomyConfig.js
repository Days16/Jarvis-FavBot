import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    enabled: row.enabled,
    currencyName: row.currency_name,
    currencyEmoji: row.currency_emoji,
    dailyAmount: row.daily_amount,
    workMin: row.work_min,
    workMax: row.work_max,
    workCooldown: row.work_cooldown,
    shopItems: row.shop_items ?? [],
  };
}

export async function getEconomyConfig(guildId) {
  const { data } = await supabase
    .from('guild_economy_config')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();
  return normalize(data);
}

export async function ensureEconomyConfig(guildId) {
  const existing = await getEconomyConfig(guildId);
  if (existing) return existing;
  const { data } = await supabase
    .from('guild_economy_config')
    .insert({ guild_id: guildId })
    .select()
    .single();
  return normalize(data);
}

export async function updateEconomyConfig(guildId, updates) {
  const snake = {};
  if ('enabled'       in updates) snake.enabled        = updates.enabled;
  if ('currencyName'  in updates) snake.currency_name  = updates.currencyName;
  if ('currencyEmoji' in updates) snake.currency_emoji = updates.currencyEmoji;
  if ('dailyAmount'   in updates) snake.daily_amount   = updates.dailyAmount;
  if ('workMin'       in updates) snake.work_min       = updates.workMin;
  if ('workMax'       in updates) snake.work_max       = updates.workMax;
  if ('workCooldown'  in updates) snake.work_cooldown  = updates.workCooldown;
  if ('shopItems'     in updates) snake.shop_items     = updates.shopItems;
  const { data } = await supabase
    .from('guild_economy_config')
    .update(snake)
    .eq('guild_id', guildId)
    .select()
    .single();
  return normalize(data);
}
