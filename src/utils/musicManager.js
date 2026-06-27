import { Shoukaku, Connectors } from 'shoukaku';
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { getConfig } from '../models/BotConfig.js';
import { logger } from './logger.js';

export const RepeatMode = Object.freeze({ NONE: 0, SONG: 1, QUEUE: 2 });

// ── Estado por servidor ───────────────────────────────────────────────
// queue: { songs: Array<{track, requestedBy}>, loop, volume, textChannel, voiceChannelId }
const queues = new Map();
let shoukaku = null;

// Búsquedas pendientes de selección: key = `${guildId}:${userId}`
// value = { tracks, vcId, requestedBy }
export const pendingMusicSearches = new Map();

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
  const isSecure = secure === 'true';
  // Render rechaza WSS con puerto explícito cuando es el predeterminado (:443 para wss, :80 para ws)
  const isDefaultPort = (isSecure && port === '443') || (!isSecure && port === '80');
  const urlHost = isDefaultPort ? host : `${host}:${port}`;
  return [{ name: 'main', url: urlHost, auth: pass, secure: isSecure }];
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

  player.on('exception', async data => {
    const rawMsg = data?.exception?.message ?? '';
    logger.error(`[Lavalink] excepción en ${guildId}: ${rawMsg || 'desconocido'}`);
    const q = queues.get(guildId);
    if (!q) return;

    const failedSong = q.songs[0];

    // SoundCloud 404 → intentar track alternativo antes de rendirse
    const isSoundCloud404 = /invalid status code for soundcloud/i.test(rawMsg) || /soundcloud.*404/i.test(rawMsg);
    if (isSoundCloud404 && failedSong) {
      const altTracks = failedSong._altTracks ?? [];
      const altIdx    = failedSong._altIdx ?? 0;
      if (altIdx < altTracks.length) {
        const next = altTracks[altIdx];
        q.songs[0] = { ...failedSong, track: next, _altIdx: altIdx + 1 };
        logger.info(`[Lavalink] SoundCloud 404 — reintentando con alternativo ${altIdx + 1}/${altTracks.length}`);
        q.textChannel?.send({
          embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`⚠️ El stream falló, probando resultado alternativo ${altIdx + 1}…`)],
        }).catch(() => {});
        player.playTrack({ track: { encoded: next.encoded } }).catch(() => {});
        return;
      }
      // Agotados los alternativos
      q.textChannel?.send({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('❌ SoundCloud no pudo reproducir ningún resultado para esta búsqueda. Prueba con otro nombre.')],
      }).catch(() => {});
    } else {
      let friendlyMsg;
      if (/requires.*(login|auth)/i.test(rawMsg) || /all clients failed/i.test(rawMsg)) {
        friendlyMsg = '❌ Este vídeo no está disponible (requiere inicio de sesión o está restringido).';
      } else if (/not found|not available|private/i.test(rawMsg)) {
        friendlyMsg = '❌ Vídeo no encontrado o no disponible.';
      } else if (rawMsg) {
        friendlyMsg = `❌ Error de reproducción: ${rawMsg}`;
      } else {
        friendlyMsg = '❌ Error desconocido al reproducir.';
      }
      q.textChannel?.send({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(friendlyMsg)],
      }).catch(() => {});
    }

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

// Espera hasta que Lavalink responda por HTTP antes de abrir el WebSocket
async function awaitLavalinkReady(node, maxWaitMs = 120_000) {
  const proto = node.secure ? 'https' : 'http';
  const url   = `${proto}://${node.url}/version`;
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await axios.get(url, { headers: { Authorization: node.auth }, timeout: 10_000 });
      if (res.status === 200) {
        logger.info(`[Lavalink] Servidor responde (intento ${attempt + 1}): v${res.data?.semver ?? res.data?.version?.semver ?? '?'} ✓`);
        return true;
      }
    } catch {
      attempt++;
      logger.info(`[Lavalink] Esperando que Lavalink arranque… (${attempt})`);
      await new Promise(r => setTimeout(r, 10_000));
    }
  }
  logger.warn('[Lavalink] No respondió en 2 min — shoukaku intentará conectar igualmente.');
  return false;
}

// ── API pública ───────────────────────────────────────────────────────
export async function initMusic(client) {
  const nodes = await getNodeConfig();
  if (!nodes) {
    logger.warn('[Music] Lavalink no configurado. Añade LAVALINK_HOST/PORT/PASS en Render, o usa /music node en Discord.');
    return null;
  }

  // Esperar a que Lavalink esté disponible (maneja cold-start de Render)
  await awaitLavalinkReady(nodes[0]);

  // Pasamos [] como nodes al constructor — shoukaku registra el listener de "clientReady"
  // pero el evento ya disparó (initMusic se llama desde el handler de ready).
  // Conectamos manualmente después de asignar el ID del bot.
  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [], {
    resume:              false,
    reconnectTries:      360,
    reconnectInterval:   15000,
    moveOnDisconnect:    false,
  });

  shoukaku.on('ready',      name           => logger.success(`[Lavalink] Nodo "${name}" conectado ✓`));
  shoukaku.on('error',      (name, e)      => logger.error(`[Lavalink] Error en "${name}": ${e?.message ?? e}`));
  shoukaku.on('disconnect', (name, count)  => logger.warn(`[Lavalink] Nodo "${name}" desconectado (intento ${count})`));
  shoukaku.on('close',      (name, code, reason) =>
    logger.warn(`[Lavalink] WS cerrado "${name}" → código ${code}${reason ? ` (${reason})` : ''}`),
  );
  shoukaku.on('debug',      (name, info)   => logger.debug(`[shoukaku/${name}] ${info}`));

  // El bot ya está listo — conectar el nodo directamente sin esperar "clientReady"
  shoukaku.id = client.user.id;
  shoukaku.addNode(nodes[0]);

  const cfg = nodes[0];
  logger.info(`[Lavalink] Conectando a ${cfg.secure ? 'wss' : 'ws'}://${cfg.url} …`);
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

const YT_URL_RE = /(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/i;
const SPOTIFY_URL_RE = /open\.spotify\.com\//i;

function extractYoutubeVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0];
    return u.searchParams.get('v') || u.pathname.split('/').pop() || null;
  } catch { return null; }
}

export async function searchTracks(query, forcePlaylist = false) {
  if (!shoukaku) throw new Error('Lavalink no está configurado.');
  const node = [...shoukaku.nodes.values()][0];
  if (!node) throw new Error('No hay nodos Lavalink disponibles.');

  const trimmed = query.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (!isUrl) {
    return node.rest.resolve(`scsearch:${trimmed}`);
  }

  // Spotify URL → LavaSrc resuelve metadata → scsearch está primero en providers → SoundCloud
  if (SPOTIFY_URL_RE.test(trimmed)) {
    return node.rest.resolve(trimmed);
  }

  // YouTube URL → intentar; si falla por cipher/login, buscar por título en SoundCloud
  if (YT_URL_RE.test(trimmed)) {
    const videoId = extractYoutubeVideoId(trimmed);
    let identifier = trimmed;
    if (!forcePlaylist && /[?&]list=/i.test(trimmed) && videoId) {
      identifier = `https://www.youtube.com/watch?v=${videoId}`;
    }

    const result = await node.rest.resolve(identifier);
    if (!result || result.loadType === 'error' || result.loadType === 'empty') {
      // YouTube falló (cipher/login en Render) → buscar en SoundCloud
      const track = result?.data?.tracks?.[0];
      const scQuery = track?.info?.title
        ? `${track.info.author} ${track.info.title}`
        : videoId || trimmed;
      return node.rest.resolve(`scsearch:${scQuery}`);
    }
    return result;
  }

  // Otra URL (Bandcamp, SoundCloud directo, etc.)
  if (!forcePlaylist && /[?&]list=/i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const videoId = u.searchParams.get('v');
      return node.rest.resolve(videoId ? `https://www.youtube.com/watch?v=${videoId}` : trimmed);
    } catch { /* continúa */ }
  }
  return node.rest.resolve(trimmed);
}

export function destroyQueue(guildId) {
  _leaveAndClean(guildId);
}
