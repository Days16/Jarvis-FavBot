import { supabase } from '../utils/database.js';

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    ticketNum: row.ticket_num,
    guildId: row.guild_id,
    channelId: row.channel_id,
    creatorId: row.creator_id,
    claimedBy: row.claimed_by,
    category: row.category,
    reason: row.reason,
    status: row.status,
    rating: row.rating,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
  };
}

export async function createTicket({ ticketNum, guildId, channelId, creatorId, category, reason }) {
  const { data } = await supabase
    .from('tickets')
    .insert({ ticket_num: ticketNum, guild_id: guildId, channel_id: channelId, creator_id: creatorId, category, reason })
    .select()
    .single();
  return normalize(data);
}

export async function getTicketByChannel(channelId) {
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('channel_id', channelId)
    .eq('status', 'open')
    .maybeSingle();
  return normalize(data);
}

export async function getTicketById(id) {
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return normalize(data);
}

export async function getOpenTickets(guildId) {
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('guild_id', guildId)
    .eq('status', 'open')
    .order('opened_at', { ascending: true });
  return (data ?? []).map(normalize);
}

export async function closeTicket(channelId, claimedBy) {
  const { data } = await supabase
    .from('tickets')
    .update({ status: 'closed', closed_at: new Date().toISOString(), claimed_by: claimedBy ?? null })
    .eq('channel_id', channelId)
    .eq('status', 'open')
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function claimTicket(channelId, userId) {
  const { data } = await supabase
    .from('tickets')
    .update({ claimed_by: userId })
    .eq('channel_id', channelId)
    .eq('status', 'open')
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function unclaimTicket(channelId) {
  const { data } = await supabase
    .from('tickets')
    .update({ claimed_by: null })
    .eq('channel_id', channelId)
    .eq('status', 'open')
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function rateTicket(id, rating) {
  const { data } = await supabase
    .from('tickets')
    .update({ rating })
    .eq('id', id)
    .select()
    .maybeSingle();
  return normalize(data);
}

export async function getTicketStats(guildId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: monthly } = await supabase
    .from('tickets')
    .select('*')
    .eq('guild_id', guildId)
    .eq('status', 'closed')
    .gte('created_at', startOfMonth);

  if (!monthly?.length) return { total: 0, avgResponseMs: 0, avgCloseMs: 0, avgRating: 0, staffStats: {} };

  let totalRating = 0, ratingCount = 0, totalCloseMs = 0, closeCount = 0;
  const staffStats = {};

  for (const t of monthly) {
    if (t.rating) { totalRating += t.rating; ratingCount++; }
    if (t.closed_at && t.opened_at) {
      totalCloseMs += new Date(t.closed_at) - new Date(t.opened_at);
      closeCount++;
    }
    if (t.claimed_by) {
      if (!staffStats[t.claimed_by]) staffStats[t.claimed_by] = { count: 0, totalRating: 0, ratingCount: 0 };
      staffStats[t.claimed_by].count++;
      if (t.rating) { staffStats[t.claimed_by].totalRating += t.rating; staffStats[t.claimed_by].ratingCount++; }
    }
  }

  return {
    total: monthly.length,
    avgCloseMs: closeCount ? Math.round(totalCloseMs / closeCount) : 0,
    avgRating: ratingCount ? (totalRating / ratingCount).toFixed(1) : 0,
    staffStats,
  };
}
