import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    hostId: row.host_id,
    prize: row.prize,
    description: row.description,
    winnersCount: row.winners_count,
    participants: row.participants ?? [],
    winnerIds: row.winner_ids ?? [],
    endAt: row.end_at,
    ended: row.ended,
    createdAt: row.created_at,
  };
}

export async function createGiveaway({ guildId, channelId, hostId, prize, description, winnersCount, endAt }) {
  const { data } = await supabase
    .from('giveaways')
    .insert({
      guild_id: guildId,
      channel_id: channelId,
      host_id: hostId,
      prize,
      description: description ?? null,
      winners_count: winnersCount,
      end_at: endAt,
    })
    .select()
    .single();
  return normalize(data);
}

export async function getGiveaway(id) {
  const { data } = await supabase
    .from('giveaways')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return normalize(data);
}

export async function updateGiveaway(id, updates) {
  const snake = {};
  if ('messageId'    in updates) snake.message_id    = updates.messageId;
  if ('participants' in updates) snake.participants  = updates.participants;
  if ('winnerIds'    in updates) snake.winner_ids    = updates.winnerIds;
  if ('ended'        in updates) snake.ended         = updates.ended;
  const { data } = await supabase
    .from('giveaways')
    .update(snake)
    .eq('id', id)
    .select()
    .single();
  return normalize(data);
}

export async function getActiveGiveaways(guildId) {
  const { data } = await supabase
    .from('giveaways')
    .select('*')
    .eq('guild_id', guildId)
    .eq('ended', false)
    .order('end_at', { ascending: true });
  return (data ?? []).map(normalize);
}

export async function getExpiredGiveaways() {
  const { data } = await supabase
    .from('giveaways')
    .select('*')
    .eq('ended', false)
    .lte('end_at', new Date().toISOString());
  return (data ?? []).map(normalize);
}

export async function toggleParticipant(id, userId) {
  const giveaway = await getGiveaway(id);
  if (!giveaway || giveaway.ended) return null;

  const participants = [...giveaway.participants];
  const idx = participants.indexOf(userId);
  const joined = idx === -1;

  if (joined) participants.push(userId);
  else participants.splice(idx, 1);

  await updateGiveaway(id, { participants });
  return { joined, count: participants.length };
}
