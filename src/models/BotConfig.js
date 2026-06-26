import { supabase } from '../utils/database.js';

// Cache en memoria para no ir a Supabase en cada mensaje
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function getConfig(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;

  const { data } = await supabase
    .from('bot_config').select('value').eq('key', key).maybeSingle();

  const value = data?.value ?? null;
  cache.set(key, { value, ts: Date.now() });
  return value;
}

export async function setConfig(key, value) {
  await supabase
    .from('bot_config')
    .upsert({ key, value }, { onConflict: 'key' });
  cache.set(key, { value, ts: Date.now() });
}

export async function getAllConfig() {
  const { data } = await supabase
    .from('bot_config').select('key, value, description').order('key');
  return data ?? [];
}

export function invalidateCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}
