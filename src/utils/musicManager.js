import { Shoukaku, Connectors } from 'shoukaku';
import { EmbedBuilder } from 'discord.js';
import { getConfig } from '../models/BotConfig.js';
import { logger } from './logger.js';

export const RepeatMode = Object.freeze({ NONE: 0, SONG: 1, QUEUE: 2 });

// ── Estado por servidor ───────────────────────────────────────────────
// queue: { songs: Array<{track, requestedBy}>, loop, volume, textChannel, voiceChannelId }
const queues = new Map();
let shoukaku = null;

// ── Utilidades ────────────────────────────────────────────────────────
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '∞';
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

async function getNodeConfig() {
  const host = (await getConfig('lavalink_host').catch(() => null)) || process.env.LAVALINK_HOST;
  if (!host) return null;
  const port   = (await getConfig('lavalink_port').catch(() => null))   || process.env.LAVALINK_PORT   || '2333';
  const pass   = (await getConfig('lavalink_pass').catch(() => null))   || process.env.LAVALINK_PASS   || 'youshallnotpass';
  const secure = (await getConfig('lavalink_secure').catch(() => null)) || process.env.LAVALINK_SECURE || 'false';
  return [{ name: 'main', url: `${host}:${port}`, auth: pass, secure: secure === 'true' }];
}

// ── Manejo de eventos del player ──────────────────────────────────────
function setupPlayerEvents(player, guildId) {
  player.on('end', async data => {
    const q = queues.get(guildId);
    if (!q) return; // queue destruida por /stop — salir

    const reason = data?.reason;
    // 'replaced' → llamamos playTrack() manualmente en loop=SONG → ignorar
    if (reason === 'replaced') return;

    // 'finished' (fin natural) o 'stopped' (skip) → avanzar cola
    if (q.loop === RepeatMode.SONG) {
      player.playTrack({ track: { encoded: q.songs[0].track.encoded } }).catch(() => {});
      return;
    }

    if (q.loop === RepeatMode.QUEUE) {
      q.songs.push(q.songs.shift());
    } else {
      q.songs.shift();
    }

    if (q.songs.length > 0) {
      const next = q.songs[0];
      await player.playTrack({ track: { encoded: next.track.encoded } }).catch(() => {});
      player.setGlobalVolume(q.volume);
      q.textChannel?.send({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🎵 Reproduciendo ahora')
          .setDescription(`[${next.track.info.title}](${next.track.info.uri ?? '#'})`)
          .addFields(
            { name: '⏱️ Duración',      value: next.track.info.isStream ? '🔴 En vivo' : formatDuration(next.track.info.length / 1000), inline: true },
            { name: '🔊 Volumen',        value: `${q.volume}%`,                             inline: true },
            { name: '👤 Solicitado por', value: next.requestedBy?.toString() ?? '?',        inline: true },
          )
          .setThumbnail(next.track.info.artworkUrl ?? null)],
      }).catch(() => {});
    } else {
      q.textChannel?.send({
        embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⏹️ Cola terminada.')],
      }).catch(() => {});
      _leaveAndClean(guildId);
    }
  });

  player.on('exception', data => {
    logger.error(`[Lavalink] excepción en ${guildId}:`, data?.exception?.message ?? 'desconocido');
    const q = queues.get(guildId);
    q?.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xed4245)
        .setDescription(`❌ Error de reproducción: ${data?.exception?.message ?? 'desconocido'}`)],
    }).catch(() => {});
    if (!q) return;
    q.songs.shift();
    if (q.songs.length > 0) {
      player.playTrack({ track: { encoded: q.songs[0].track.encoded } }).catch(() => {});
    } else {
      _leaveAndClean(guildId);
    }
  });

  player.on('stuck', () => {
    logger.warn(`[Lavalink] track stuck en ${guildId}, saltando...`);
    player.stopTrack().catch(() => {});
  });

  player.on('closed', data => {
    if (data?.byRemote) queues.delete(guildId);
  });
}

function _leaveAndClean(guildId) {
  queues.delete(guildId);
  try { shoukaku?.leaveVoiceChannel(guildId); } catch { /* noop */ }
}

// ── API pública ───────────────────────────────────────────────────────
export async function initMusic(client) {
  const nodes = await getNodeConfig();
  if (!nodes) {
    logger.warn('[Music] Lavalink no configurado. Añade LAVALINK_HOST/PORT/PASS en Render, o usa /music node en Discord.');
    return null;
  }

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
    resume:              false,
    reconnectTries:      360,   // 360 × 15s = 90 min de reintentos (espera cold start de Render)
    reconnectInterval:   15000,
    moveOnDisconnect:    false,
  });

  shoukaku.on('ready',      name      => logger.success(`[Lavalink] Nodo "${name}" conectado ✓`));
  shoukaku.on('error',      (name, e) => logger.error(`[Lavalink] Error en "${name}": ${e?.message}`));
  shoukaku.on('disconnect', name      => logger.warn(`[Lavalink] Nodo "${name}" desconectado`));

  logger.info('Sistema de música inicializado (Lavalink/shoukaku).');
  return shoukaku;
}

export function getShoukaku()      { return shoukaku; }
export function getQueue(guildId)  { return queues.get(guildId) ?? null; }
export function getPlayer(guildId) { return shoukaku?.players.get(guildId) ?? null; }
export function isLavalinkReady()  { return !!shoukaku && shoukaku.nodes.size > 0; }

export function ensureQueue(guildId, textChannel, voiceChannelId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, { songs: [], loop: RepeatMode.NONE, volume: 80, textChannel, voiceChannelId });
  }
  return queues.get(guildId);
}

export async function getOrCreatePlayer(guild, voiceChannelId) {
  if (!shoukaku) throw new Error('Lavalink no está configurado. Usa `/music node` para añadir un nodo.');

  const existing = shoukaku.players.get(guild.id);
  if (existing) return existing;

  const node = [...shoukaku.nodes.values()][0];
  if (!node) throw new Error('No hay nodos Lavalink disponibles en este momento.');

  const player = await shoukaku.joinVoiceChannel({
    guildId:   guild.id,
    channelId: voiceChannelId,
    shardId:   guild.shardId ?? 0,
    deaf:      true,
  });
  setupPlayerEvents(player, guild.id);
  return player;
}

export async function searchTracks(query) {
  if (!shoukaku) throw new Error('Lavalink no está configurado.');
  const node = [...shoukaku.nodes.values()][0];
  if (!node) throw new Error('No hay nodos Lavalink disponibles.');

  const isUrl = /^https?:\/\//i.test(query.trim());
  const identifier = isUrl ? query.trim() : `ytsearch:${query}`;
  return node.rest.resolve(identifier);
}

export function destroyQueue(guildId) {
  _leaveAndClean(guildId);
}
