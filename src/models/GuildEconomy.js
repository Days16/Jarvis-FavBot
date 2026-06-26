import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    guildId: row.guild_id,
    userId: row.user_id,
    balance: row.balance,
    lastDaily: row.last_daily,
    lastWork: row.last_work,
  };
}

export async function getEconomy(guildId, userId) {
  const { data } = await supabase
    .from('guild_economy')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();
  return normalize(data);
}

export async function ensureEconomy(guildId, userId) {
  const existing = await getEconomy(guildId, userId);
  if (existing) return existing;
  const { data } = await supabase
    .from('guild_economy')
    .insert({ guild_id: guildId, user_id: userId })
    .select()
    .single();
  return normalize(data);
}

export async function updateEconomy(guildId, userId, updates) {
  const snake = {};
  if ('balance'   in updates) snake.balance    = updates.balance;
  if ('lastDaily' in updates) snake.last_daily = updates.lastDaily;
  if ('lastWork'  in updates) snake.last_work  = updates.lastWork;
  const { data } = await supabase
    .from('guild_economy')
    .update(snake)
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .select()
    .single();
  return normalize(data);
}

export async function addBalance(guildId, userId, amount) {
  const eco = await ensureEconomy(guildId, userId);
  const newBalance = Math.max(0, eco.balance + amount);
  return updateEconomy(guildId, userId, { balance: newBalance });
}

export async function getEconomyLeaderboard(guildId, limit = 10) {
  const { data } = await supabase
    .from('guild_economy')
    .select('*')
    .eq('guild_id', guildId)
    .order('balance', { ascending: false })
    .limit(limit);
  return (data ?? []).map(normalize);
}
