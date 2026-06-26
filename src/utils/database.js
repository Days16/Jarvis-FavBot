import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function connectDatabase() {
  // Verifica que la conexión funciona haciendo una query mínima
  const { error } = await supabase.from('guilds').select('guild_id').limit(1);
  if (error && error.code !== 'PGRST116') {
    logger.error('Error conectando a Supabase:', error.message);
    process.exit(1);
  }
  logger.success(`Supabase conectado: ${process.env.SUPABASE_URL.replace('https://', '').split('.')[0]}.supabase.co`);
}
