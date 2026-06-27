import { DisTube, Song, Playlist } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { EmbedBuilder } from 'discord.js';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { logger } from './logger.js';
import ffmpegPath from 'ffmpeg-static';
import axios from 'axios';

// Disable TLS verification errors for public proxy API instances
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ─── yt-dlp binary detection ───────────────────────────────────────
function findYtDlpBin() {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const candidates = [
    join(process.cwd(), process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
    join(process.cwd(), 'node_modules/@distube/yt-dlp/bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
  ];
  return candidates.find(existsSync) ?? 'yt-dlp';
}

const YTDLP_BIN = findYtDlpBin();
let cookieSource = 'none';

// Player client strategies — 'default' lets yt-dlp use its own best client.
const CLIENT_STRATEGIES = [
  'default',
  'android_vr',
];

// Piped API instances (open-source YouTube proxy — no cookies needed)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.adminforge.de',
];

// Invidious instances (fetched dynamically, these are hardcoded fallbacks)
let invidiousInstances = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.f5.si',
  'https://inv.zoomerville.com',
  'https://invidious.tiekoetter.com',
];
let invidiousFetchedAt = 0;

// ─── Optional cookie support (no longer required) ──────────────────
function materializeCookieContent(value, encoding) {
  if (!value) return null;
  const dir = join(tmpdir(), 'jarvis-favbot');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'youtube-cookies.txt');
  const content = encoding === 'base64'
    ? Buffer.from(value, 'base64').toString('utf8')
    : value.replace(/\\n/g, '\n');
  writeFileSync(path, content, { mode: 0o600 });
  return path;
}

function looksLikeCookieContent(value) {
  return value.includes('Netscape HTTP Cookie File')
    || value.includes('\t.youtube.com\t')
    || value.includes('\\t.youtube.com\\t');
}

const COOKIES_PATH = (() => {
  const fromBase64 = materializeCookieContent(process.env.YTDLP_COOKIES_BASE64, 'base64');
  if (fromBase64) { cookieSource = 'YTDLP_COOKIES_BASE64'; return fromBase64; }

  const fromContent = materializeCookieContent(process.env.YTDLP_COOKIES_CONTENT);
  if (fromContent) { cookieSource = 'YTDLP_COOKIES_CONTENT'; return fromContent; }

  const envVal = process.env.YTDLP_COOKIES;
  if (envVal) {
    const abs = /^([A-Za-z]:\\|\/)/.test(envVal) ? envVal : join(process.cwd(), envVal);
    if (existsSync(abs)) { cookieSource = 'YTDLP_COOKIES'; return abs; }
    if (looksLikeCookieContent(envVal)) {
      const fromEnvContent = materializeCookieContent(envVal);
      if (fromEnvContent) { cookieSource = 'YTDLP_COOKIES'; return fromEnvContent; }
    }
  }

  const auto = join(process.cwd(), 'cookies.txt');
  if (existsSync(auto)) { cookieSource = 'cookies.txt'; return auto; }
  return null;
})();

if (COOKIES_PATH) {
  process.env.YTDLP_COOKIES = COOKIES_PATH;
  logger.info(`[Music] Cookies opcionales detectadas (${cookieSource})`);
} else {
  logger.info('[Music] Sin cookies — modo sin login (normal).');
}

// ─── yt-dlp core ───────────────────────────────────────────────────
function buildYtDlpArgs(url, options = {}) {
  const clients = options.playerClients || CLIENT_STRATEGIES[0];
  const args = [
    url,
    '--dump-single-json',
    '--no-warnings',
    '--skip-download',
    '--simulate',
  ];

  if (clients !== 'default') {
    args.push('--extractor-args', `youtube:player_client=${clients}`);
  }

  if (options.format) args.push('--format', options.format);
  if (options.useCookies !== false && COOKIES_PATH) args.push('--cookies', COOKIES_PATH);

  return args;
}

const YTDLP_TIMEOUT_MS = 12_000; // kill yt-dlp if it hangs longer than 12s

function runYtDlpJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_BIN, buildYtDlpArgs(url, options), { windowsHide: true });
    let out = '';
    let err = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp timeout (12s)'));
    }, YTDLP_TIMEOUT_MS);

    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      clearTimeout(timer);
      if (killed) return;
      if (code !== 0) {
        reject(new Error(err.trim() || out.trim() || `yt-dlp exit ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch (parseErr) {
        reject(new Error(`yt-dlp JSON invalido: ${parseErr.message}`));
      }
    });
    proc.on('error', e => {
      clearTimeout(timer);
      if (!killed) reject(e);
    });
  });
}

/**
 * Retry yt-dlp with multiple player client strategies.
 * First round: with cookies (if available). Second round: without cookies.
 */
async function runYtDlpWithRetry(url, options = {}) {
  let lastError;
  const shortUrl = url.length > 60 ? url.slice(0, 60) + '...' : url;
  logger.info(`[Music] \u25b6 runYtDlpWithRetry \u2014 ${shortUrl}`);

  // === ROUND 1: Try WITHOUT cookies (bad cookies cause bot detection!) ===
  for (let i = 0; i < CLIENT_STRATEGIES.length; i++) {
    const clients = CLIENT_STRATEGIES[i];
    logger.info(`[Music]   Intento ${i + 1}/${CLIENT_STRATEGIES.length}: client=${clients} (sin cookies)`);
    try {
      const result = await runYtDlpJson(url, { ...options, playerClients: clients, useCookies: false });
      logger.info(`[Music]   \u2705 yt-dlp OK con client=${clients}`);
      return result;
    } catch (e) {
      lastError = e;
      logger.warn(`[Music]   \u274c Fallo: ${e.message?.slice(0, 150)}`);
    }
  }

  // === ROUND 2: Try WITH cookies if available (last resort) ===
  if (COOKIES_PATH) {
    logger.info('[Music]   \ud83d\udd04 Ronda 2: CON cookies...');
    for (let i = 0; i < CLIENT_STRATEGIES.length; i++) {
      const clients = CLIENT_STRATEGIES[i];
      logger.info(`[Music]   Intento con-cookies ${i + 1}/${CLIENT_STRATEGIES.length}: client=${clients}`);
      try {
        const result = await runYtDlpJson(url, { ...options, playerClients: clients, useCookies: true });
        logger.info(`[Music]   \u2705 yt-dlp OK con cookies, client=${clients}`);
        return result;
      } catch (e) {
        lastError = e;
        logger.warn(`[Music]   \u274c Fallo con cookies: ${e.message?.slice(0, 150)}`);
      }
    }
  }

  logger.error(`[Music] \u25b6 runYtDlpWithRetry AGOTADA \u2014 todas las estrategias fallaron`);
  throw lastError;
}

// ─── Piped API fallback (no cookies, no yt-dlp) ────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
  } catch {}
  return null;
}

async function pipedExtractStream(videoId) {
  logger.info(`[Music] \u25b6 pipedExtractStream \u2014 videoId=${videoId}`);
  for (let i = 0; i < PIPED_INSTANCES.length; i++) {
    const api = PIPED_INSTANCES[i];
    logger.info(`[Music]   Piped ${i + 1}/${PIPED_INSTANCES.length}: ${api}/streams/${videoId}`);
    try {
      const res = await axios.get(`${api}/streams/${videoId}`, { timeout: 8000 });
      const data = res.data;

      // Verify we got JSON, not an HTML anti-bot page
      if (typeof data !== 'object' || !data.audioStreams) {
        logger.warn(`[Music]   \u274c Piped no devolvio JSON valido`);
        continue;
      }

      const audioCount = data.audioStreams?.length ?? 0;
      logger.info(`[Music]   Piped respondio: ${audioCount} audio streams`);

      const best = data.audioStreams
        ?.filter(s => s?.url)
        ?.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

      if (best?.url) {
        logger.info(`[Music]   \u2705 Piped OK \u2014 bitrate=${best.bitrate}, codec=${best.codec ?? '?'}`);
        return {
          url:         best.url,
          title:       data.title ?? 'Desconocido',
          duration:    data.duration ?? 0,
          thumbnail:   data.thumbnailUrl ?? null,
          uploader:    data.uploader ?? null,
          uploaderUrl: data.uploaderUrl ?? null,
          views:       data.views ?? 0,
          likes:       data.likes ?? 0,
        };
      }
      logger.warn(`[Music]   \u274c Piped sin audio streams validos`);
    } catch (e) {
      const status = e.response?.status;
      logger.warn(`[Music]   \u274c Piped error: ${status ? `HTTP ${status}` : e.message?.slice(0, 100)}`);
    }
  }
  logger.error(`[Music] \u25b6 pipedExtractStream AGOTADA`);
  return null;
}

// \u2500\u2500\u2500 Invidious API fallback \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function refreshInvidiousInstances() {
  if (Date.now() - invidiousFetchedAt < 30 * 60 * 1000) return; // cache 30min
  try {
    const res = await axios.get('https://api.invidious.io/instances.json', { timeout: 5000 });
    const active = res.data
      .filter(x => x[1]?.type === 'https' && x[1]?.monitor && !x[1]?.monitor?.down)
      .map(x => x[1].uri);
    if (active.length > 0) {
      invidiousInstances = active;
      invidiousFetchedAt = Date.now();
      logger.info(`[Music] Invidious: ${active.length} instancias activas descubiertas`);
    }
  } catch (e) {
    logger.warn(`[Music] No se pudo actualizar lista Invidious: ${e.message?.slice(0, 80)}`);
  }
}

async function invidiousExtractStream(videoId) {
  await refreshInvidiousInstances();
  logger.info(`[Music] \u25b6 invidiousExtractStream \u2014 videoId=${videoId} (${invidiousInstances.length} instancias)`);
  for (let i = 0; i < invidiousInstances.length; i++) {
    const api = invidiousInstances[i];
    try {
      const res = await axios.get(`${api}/api/v1/videos/${videoId}`, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const data = res.data;
      if (!data?.adaptiveFormats) continue;

      const audioFormats = data.adaptiveFormats.filter(f => f.type?.startsWith('audio/'));
      logger.info(`[Music]   Invidious ${i + 1}: ${audioFormats.length} audio formats`);

      const best = audioFormats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      if (best?.url) {
        logger.info(`[Music]   \u2705 Invidious OK via ${new URL(api).hostname}`);
        return {
          url:         best.url,
          title:       data.title ?? 'Desconocido',
          duration:    data.lengthSeconds ?? 0,
          thumbnail:   data.videoThumbnails?.[0]?.url ?? null,
          uploader:    data.author ?? null,
          uploaderUrl: data.authorUrl ? `https://www.youtube.com${data.authorUrl}` : null,
          views:       data.viewCount ?? 0,
          likes:       data.likeCount ?? 0,
        };
      }
    } catch (e) {
      const status = e.response?.status;
      logger.warn(`[Music]   \u274c Invidious ${new URL(api).hostname}: ${status ? `HTTP ${status}` : e.message?.slice(0, 60)}`);
    }
  }
  logger.error(`[Music] \u25b6 invidiousExtractStream AGOTADA`);
  return null;
}

async function pipedSearch(query) {
  for (const api of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `${api}/search?q=${encodeURIComponent(query)}&filter=videos`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      const first = data.items?.[0];
      if (first?.url) {
        const videoUrl = `https://www.youtube.com${first.url}`;
        logger.debug(`[Music] Piped search OK: ${videoUrl}`);
        return videoUrl;
      }
    } catch (e) {
      logger.debug(`[Music] Piped search ${api}: ${e.message?.slice(0, 80)}`);
    }
  }
  return null;
}

// ─── Audio URL picker ──────────────────────────────────────────────
function pickAudioURL(info) {
  if (info?.url) return info.url;

  const candidates = info?.formats
    ?.filter(f => f?.url && f?.acodec && f.acodec !== 'none') ?? [];

  if (!candidates.length) return null;

  // Prefer audio-only (vcodec=none) over muxed streams to save bandwidth
  const audioOnly = candidates.filter(f => !f.vcodec || f.vcodec === 'none');
  const pool = audioOnly.length ? audioOnly : candidates;

  const best = pool.sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0];
  logger.debug(`[Music] pickAudioURL -> fmt=${best.format_id} codec=${best.acodec} abr=${best.abr ?? '?'}`);
  return best.url;
}

// ─── Diagnostics ───────────────────────────────────────────────────
export function getMusicDiagnostics() {
  return {
    ytdlpBin: YTDLP_BIN,
    cookiesDetected: Boolean(COOKIES_PATH),
    cookieSource,
    cookiesPath: COOKIES_PATH ? '[configured]' : null,
    clientStrategies: CLIENT_STRATEGIES,
    pipedFallback: true,
    pipedInstances: PIPED_INSTANCES.length,
  };
}

// ─── Song builder ──────────────────────────────────────────────────
function makeSong(plugin, info, options) {
  return new Song({
    plugin,
    source:         info.extractor || 'youtube',
    playFromSource: true,
    id:             info.id,
    name:           info.title || info.fulltitle || 'Desconocido',
    url:            info.webpage_url || info.original_url,
    isLive:         !!info.is_live,
    thumbnail:      info.thumbnail ?? info.thumbnails?.[0]?.url ?? null,
    duration:       info.is_live ? 0 : (info.duration ?? 0),
    uploader:       { name: info.uploader ?? null, url: info.uploader_url ?? null },
    views:          info.view_count  ?? 0,
    likes:          info.like_count  ?? 0,
    dislikes:       info.dislike_count ?? 0,
    reposts:        info.repost_count ?? 0,
    ageRestricted:  Boolean(info.age_limit) && info.age_limit >= 18,
  }, options);
}

// ─── yt-dlp plugin patching ────────────────────────────────────────
function patchYtDlpPlugin(plugin) {

  // ── resolve: get video/playlist metadata ──
  plugin.resolve = async function(url, options) {
    logger.info(`[Music] ════ RESOLVE ════ url=${url}`);
    let info;

    try {
      info = await runYtDlpWithRetry(url);
    } catch (ytdlpErr) {
      logger.warn('[Music] yt-dlp agoto todas las estrategias, intentando APIs proxy...');

      // Fallback to Piped/Invidious for YouTube URLs
      const videoId = extractVideoId(url);
      if (videoId) {
        // Try Piped first
        const piped = await pipedExtractStream(videoId);
        if (piped) {
          logger.info(`[Music] \u2705 RESOLVE via Piped \u2014 "${piped.title}"`);
          return new Song({
            plugin,
            source:         'youtube',
            playFromSource: true,
            id:             videoId,
            name:           piped.title,
            url,
            isLive:         false,
            thumbnail:      piped.thumbnail,
            duration:       piped.duration,
            uploader:       { name: piped.uploader, url: piped.uploaderUrl },
            views:          piped.views,
            likes:          piped.likes,
            dislikes:       0,
            reposts:        0,
            ageRestricted:  false,
          }, options);
        }

        // Try Invidious
        const invidious = await invidiousExtractStream(videoId);
        if (invidious) {
          logger.info(`[Music] \u2705 RESOLVE via Invidious \u2014 "${invidious.title}"`);
          return new Song({
            plugin,
            source:         'youtube',
            playFromSource: true,
            id:             videoId,
            name:           invidious.title,
            url,
            isLive:         false,
            thumbnail:      invidious.thumbnail,
            duration:       invidious.duration,
            uploader:       { name: invidious.uploader, url: invidious.uploaderUrl },
            views:          invidious.views,
            likes:          invidious.likes,
            dislikes:       0,
            reposts:        0,
            ageRestricted:  false,
          }, options);
        }
      }

      logger.error('[Music] \u274c RESOLVE FALLO \u2014 ni yt-dlp, ni Piped, ni Invidious funcionaron');
      throw new Error(
        'No se pudo obtener info del video. YouTube puede estar bloqueando temporalmente \u2014 intenta de nuevo en unos minutos.',
      );
    }

    if (Array.isArray(info.entries)) {
      if (!info.entries.length) throw new Error('La playlist esta vacia.');
      logger.info(`[Music] ✅ RESOLVE playlist — ${info.entries.length} canciones`);
      return new Playlist({
        source:    info.extractor,
        songs:     info.entries.map(i => makeSong(plugin, i, options)),
        id:        String(info.id),
        name:      info.title,
        url:       info.webpage_url,
        thumbnail: info.thumbnails?.[0]?.url ?? null,
      }, options);
    }
    logger.info(`[Music] ✅ RESOLVE OK — "${info.title}"`);
    return makeSong(plugin, info, options);
  };

  // ── getStreamURL: get playable audio URL ──
  plugin.getStreamURL = async function(song) {
    logger.info(`[Music] ════ GET STREAM URL ════ ${song.url}`);
    if (!song.url) throw new Error('URL de cancion invalida.');

    // Try yt-dlp with multiple strategies
    try {
      const info = await runYtDlpWithRetry(song.url);
      if (!Array.isArray(info.entries)) {
        const streamURL = pickAudioURL(info);
        if (streamURL) {
          logger.info(`[Music] ✅ GET STREAM URL OK via yt-dlp`);
          return streamURL;
        }
        logger.warn('[Music] yt-dlp devolvio info pero pickAudioURL no encontro audio');
      }
    } catch (e) {
      logger.warn(`[Music] yt-dlp stream fallo: ${e.message?.slice(0, 150)}`);
    }

    // Fallback to Piped
    logger.info('[Music] Intentando Piped para stream URL...');
    const videoId = extractVideoId(song.url);
    if (videoId) {
      const piped = await pipedExtractStream(videoId);
      if (piped?.url) {
        logger.info(`[Music] \u2705 GET STREAM URL OK via Piped`);
        return piped.url;
      }

      // Fallback to Invidious
      logger.info('[Music] Intentando Invidious para stream URL...');
      const invidious = await invidiousExtractStream(videoId);
      if (invidious?.url) {
        logger.info(`[Music] \u2705 GET STREAM URL OK via Invidious`);
        return invidious.url;
      }
    }

    logger.error('[Music] \u274c GET STREAM URL FALLO \u2014 sin audio disponible');
    throw new Error('No se pudo obtener el audio. Intenta de nuevo en unos minutos.');
  };
}

// ─── URL cleaning ──────────────────────────────────────────────────
function cleanYouTubeURL(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      const list    = u.searchParams.get('list') ?? '';
      const isRadio = u.searchParams.get('start_radio') === '1' || list.startsWith('RD');
      if (isRadio) return `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`;
    }
  } catch { /* ignore */ }
  return url;
}

// ─── Search / resolve query ────────────────────────────────────────
async function ytDlpSearch(query) {
  // Try without cookies first (only 'default' strategy for speed)
  try {
    return await new Promise((resolve, reject) => {
      const args = [
        `ytsearch1:${query}`,
        '--print', 'webpage_url',
        '--no-warnings',
      ];

      const proc = spawn(YTDLP_BIN, args, { windowsHide: true });
      let out = '';
      let err = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGKILL');
        reject(new Error('yt-dlp search timeout (12s)'));
      }, YTDLP_TIMEOUT_MS);

      proc.stdout.on('data', d => { out += d; });
      proc.stderr.on('data', d => { err += d; });
      proc.on('close', code => {
        clearTimeout(timer);
        if (killed) return;
        const url = out.trim().split('\n')[0];
        if (code === 0 && url.startsWith('http')) resolve(url);
        else reject(new Error(err.trim() || 'Sin resultados'));
      });
      proc.on('error', e => {
        clearTimeout(timer);
        if (!killed) reject(e);
      });
    });
  } catch (e) {
    logger.info(`[Music] yt-dlp search fallo: ${e.message?.slice(0, 80)}`);
  }

  // Fallback: Piped search
  const pipedResult = await pipedSearch(query);
  if (pipedResult) return pipedResult;

  throw new Error('No se encontro ninguna cancion. Intenta con otros terminos.');
}

export function resolvePlayQuery(raw) {
  try {
    const u = new URL(raw);
    if (['http:', 'https:'].includes(u.protocol)) {
      return Promise.resolve(cleanYouTubeURL(raw));
    }
  } catch { /* not a URL */ }
  return ytDlpSearch(raw);
}

// ─── DisTube init ──────────────────────────────────────────────────
let distube;

export function getDistube() {
  return distube;
}

export function initMusic(client) {
  const ytdlpPlugin = new YtDlpPlugin({ update: process.platform !== 'win32' });
  patchYtDlpPlugin(ytdlpPlugin);

  distube = new DisTube(client, {
    ffmpeg: { path: ffmpegPath },
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [ytdlpPlugin],
  });

  distube.on('playSong', (queue, song) => {
    const requestedBy = song.user ?? song.requestedBy;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Reproduciendo ahora')
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: '⏱️ Duración',       value: song.formattedDuration ?? '0:00', inline: true },
        { name: '🔊 Volumen',         value: `${queue.volume}%`,               inline: true },
        { name: '👤 Solicitado por',  value: requestedBy?.toString() ?? 'Desconocido', inline: true },
      )
      .setThumbnail(song.thumbnail ?? null);
    queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  });

  distube.on('addSong', (queue, song) => {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`✅ **[${song.name}](${song.url})** añadida a la cola — posición **${queue.songs.length}**.`)
      .setThumbnail(song.thumbnail ?? null);
    queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  });

  distube.on('addList', (queue, playlist) => {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`✅ Playlist **${playlist.name}** añadida — **${playlist.songs.length}** canciones.`);
    queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  });

  distube.on('error', (error, queue) => {
    logger.error('[DisTube]', error?.message ?? String(error));
    queue?.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`❌ Error de música: ${error?.message ?? 'Error desconocido'}`)],
    }).catch(() => {});
  });

  distube.on('finish', queue => {
    queue.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⏹️ Cola terminada.')],
    }).catch(() => {});
  });

  distube.on('empty', queue => {
    queue.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('📢 Canal de voz vacío, desconectando.')],
    }).catch(() => {});
  });

  distube.on('initQueue', queue => {
    queue.setVolume(80);
  });

  logger.info(`[Music] Inicializado — ${CLIENT_STRATEGIES.length} estrategias yt-dlp + ${PIPED_INSTANCES.length} instancias Piped de fallback.`);
  return distube;
}
