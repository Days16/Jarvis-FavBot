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

  player.on('exception', data => {
    const rawMsg = data?.exception?.message ?? '';
    logger.error(`[Lavalink] excepción en ${guildId}: ${rawMsg || 'desconocido'}`);
    const q = queues.get(guildId);
    let friendlyMsg;
    if (/requires.*(login|auth)/i.test(rawMsg) || /all clients failed/i.test(rawMsg)) {
      friendlyMsg = '❌ Este vídeo no está disponible (requiere inicio de sesión en YouTube o está restringido).';
    } else if (/not found|not available|private/i.test(rawMsg)) {
      friendlyMsg = '❌ Vídeo no encontrado o no disponible.';
    } else if (rawMsg) {
      friendlyMsg = `❌ Error de reproducción: ${rawMsg}`;
    } else {
      friendlyMsg = '❌ Error desconocido al reproducir.';
    }
    q?.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(friendlyMsg)],
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

export async function searchTracks(query, forcePlaylist = false) {
  if (!shoukaku) throw new Error('Lavalink no está configurado.');
  const node = [...shoukaku.nodes.values()][0];
  if (!node) throw new Error('No hay nodos Lavalink disponibles.');

  const isUrl = /^https?:\/\//i.test(query.trim());
  let identifier;
  if (isUrl) {
    // Si la URL contiene &list= pero el usuario no pide playlist explícitamente,
    // extraer solo el video (v=) para evitar cargar toda la playlist
    if (!forcePlaylist && /[?&]list=/i.test(query)) {
      try {
        const u = new URL(query.trim());
        const videoId = u.searchParams.get('v');
        identifier = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : query.trim();
      } catch {
        identifier = query.trim();
      }
    } else {
      identifier = query.trim();
    }
  } else {
    // ytmsearch usa YouTube Music API — menos restricciones de login que ytsearch para música
    identifier = `ytmsearch:${query}`;
  }
  return node.rest.resolve(identifier);
}

export function destroyQueue(guildId) {
  _leaveAndClean(guildId);
}
