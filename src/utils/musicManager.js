import { DisTube, Song, Playlist } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { EmbedBuilder } from 'discord.js';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { logger } from './logger.js';
import ffmpegPath from 'ffmpeg-static';

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

// Player client strategies — ordered by reliability without cookies
const CLIENT_STRATEGIES = [
  'ios,ios_creator',
  'android_vr,tv_embedded',
  'tv,web_creator',
  'web_safari,mweb',
];

// Piped API instances (open-source YouTube proxy — no cookies needed)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfault.com',
];

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
    '--prefer-free-formats',
    '--skip-download',
    '--simulate',
    '--extractor-args',
    `youtube:player_client=${clients}`,
  ];

  if (options.format) args.push('--format', options.format);
  if (options.useCookies !== false && COOKIES_PATH) args.push('--cookies', COOKIES_PATH);

  return args;
}

function runYtDlpJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_BIN, buildYtDlpArgs(url, options), { windowsHide: true });
    let out = '';
    let err = '';

    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
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
    proc.on('error', reject);
  });
}

/**
 * Retry yt-dlp with multiple player client strategies.
 * First round: with cookies (if available). Second round: without cookies.
 */
async function runYtDlpWithRetry(url, options = {}) {
  let lastError;

  for (const clients of CLIENT_STRATEGIES) {
    try {
      const result = await runYtDlpJson(url, { ...options, playerClients: clients });
      logger.debug(`[Music] yt-dlp OK (client: ${clients})`);
      return result;
    } catch (e) {
      lastError = e;
      logger.debug(`[Music] yt-dlp ${clients}: ${e.message?.slice(0, 120)}`);
    }
  }

  // Second pass: retry without cookies in case they're the problem
  if (COOKIES_PATH) {
    for (const clients of CLIENT_STRATEGIES) {
      try {
        const result = await runYtDlpJson(url, { ...options, playerClients: clients, useCookies: false });
        logger.debug(`[Music] yt-dlp OK sin cookies (client: ${clients})`);
        return result;
      } catch (e) {
        lastError = e;
      }
    }
  }

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
  for (const api of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${api}/streams/${videoId}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();

      const best = data.audioStreams
        ?.filter(s => s?.url)
        ?.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

      if (best?.url) {
        logger.debug(`[Music] Piped OK via ${new URL(api).hostname}`);
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
    } catch (e) {
      logger.debug(`[Music] Piped ${api}: ${e.message?.slice(0, 80)}`);
    }
  }
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
    let info;

    try {
      info = await runYtDlpWithRetry(url);
    } catch (ytdlpErr) {
      logger.warn('[Music] yt-dlp agoto todas las estrategias, intentando Piped...');

      // Fallback to Piped for YouTube URLs
      const videoId = extractVideoId(url);
      if (videoId) {
        const piped = await pipedExtractStream(videoId);
        if (piped) {
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
      }

      throw new Error(
        'No se pudo obtener info del video. YouTube puede estar bloqueando temporalmente — intenta de nuevo en unos minutos.',
      );
    }

    if (Array.isArray(info.entries)) {
      if (!info.entries.length) throw new Error('La playlist esta vacia.');
      return new Playlist({
        source:    info.extractor,
        songs:     info.entries.map(i => makeSong(plugin, i, options)),
        id:        String(info.id),
        name:      info.title,
        url:       info.webpage_url,
        thumbnail: info.thumbnails?.[0]?.url ?? null,
      }, options);
    }
    return makeSong(plugin, info, options);
  };

  // ── getStreamURL: get playable audio URL ──
  plugin.getStreamURL = async function(song) {
    if (!song.url) throw new Error('URL de cancion invalida.');

    // Try yt-dlp with multiple strategies
    try {
      const info = await runYtDlpWithRetry(song.url);
      if (!Array.isArray(info.entries)) {
        const streamURL = pickAudioURL(info);
        if (streamURL) return streamURL;
      }
    } catch (e) {
      logger.debug(`[Music] yt-dlp stream fallo: ${e.message?.slice(0, 100)}`);
    }

    // Fallback to Piped
    const videoId = extractVideoId(song.url);
    if (videoId) {
      const piped = await pipedExtractStream(videoId);
      if (piped?.url) return piped.url;
    }

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
  for (const clients of CLIENT_STRATEGIES) {
    try {
      return await new Promise((resolve, reject) => {
        const args = [
          `ytsearch1:${query}`,
          '--print', 'webpage_url',
          '--no-warnings',
          '--extractor-args', `youtube:player_client=${clients}`,
        ];
        if (COOKIES_PATH) args.push('--cookies', COOKIES_PATH);

        const proc = spawn(YTDLP_BIN, args, { windowsHide: true });
        let out = '';
        let err = '';
        proc.stdout.on('data', d => { out += d; });
        proc.stderr.on('data', d => { err += d; });
        proc.on('close', code => {
          const url = out.trim().split('\n')[0];
          if (code === 0 && url.startsWith('http')) resolve(url);
          else reject(new Error(err.trim() || 'Sin resultados'));
        });
        proc.on('error', reject);
      });
    } catch (e) {
      logger.debug(`[Music] Search ${clients}: ${e.message?.slice(0, 80)}`);
    }
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
