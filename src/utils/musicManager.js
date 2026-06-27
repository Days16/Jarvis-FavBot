import { DisTube, Song, Playlist } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { EmbedBuilder } from 'discord.js';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { logger } from './logger.js';
import ffmpegPath from 'ffmpeg-static';

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
const AUDIO_FORMAT = 'bestaudio[acodec!=none]/bestaudio/best[acodec!=none]/best';

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
  return value.includes('Netscape HTTP Cookie File') || value.includes('\t.youtube.com\t') || value.includes('\\t.youtube.com\\t');
}

// Detecta cookies.txt y lo expone como ruta absoluta
const COOKIES_PATH = (() => {
  const fromBase64 = materializeCookieContent(process.env.YTDLP_COOKIES_BASE64, 'base64');
  if (fromBase64) {
    cookieSource = 'YTDLP_COOKIES_BASE64';
    return fromBase64;
  }

  const fromContent = materializeCookieContent(process.env.YTDLP_COOKIES_CONTENT);
  if (fromContent) {
    cookieSource = 'YTDLP_COOKIES_CONTENT';
    return fromContent;
  }

  const envVal = process.env.YTDLP_COOKIES;
  if (envVal) {
    const abs = /^([A-Za-z]:\\|\/)/.test(envVal) ? envVal : join(process.cwd(), envVal);
    if (existsSync(abs)) {
      cookieSource = 'YTDLP_COOKIES';
      return abs;
    }
    if (looksLikeCookieContent(envVal)) {
      const fromEnvContent = materializeCookieContent(envVal);
      if (fromEnvContent) {
        cookieSource = 'YTDLP_COOKIES';
        return fromEnvContent;
      }
    }
  }
  const auto = join(process.cwd(), 'cookies.txt');
  if (existsSync(auto)) {
    cookieSource = 'cookies.txt';
    return auto;
  }
  return null;
})();

if (COOKIES_PATH) {
  process.env.YTDLP_COOKIES = COOKIES_PATH;
  logger.info(`[Music] Cookies de YouTube: ${COOKIES_PATH}`);
} else {
  logger.warn('[Music] cookies.txt no encontrado — algunas canciones pueden fallar.');
}

function buildYtDlpArgs(url, options = {}) {
  const args = [
    url,
    '--dump-single-json',
    '--no-warnings',
    '--prefer-free-formats',
    '--skip-download',
    '--simulate',
    '--extractor-args',
    'youtube:player_client=android_vr,tv_embedded',
  ];

  if (options.format) args.push('--format', options.format);
  if (COOKIES_PATH) args.push('--cookies', COOKIES_PATH);

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
        reject(new Error(err.trim() || out.trim() || `yt-dlp salio con codigo ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(out));
      } catch (parseErr) {
        reject(new Error(`yt-dlp no devolvio JSON valido: ${parseErr.message}`));
      }
    });
    proc.on('error', reject);
  });
}

function normalizeYtDlpError(error) {
  const message = error?.message ?? String(error);
  if (message.includes('Sign in to confirm') || message.includes('--cookies')) {
    return new Error(
      'YouTube esta bloqueando la extraccion. En Render falta una cookie valida o esta caducada. ' +
      'Configura YTDLP_COOKIES_BASE64 con cookies nuevas exportadas de YouTube y redeploy.',
    );
  }
  return error;
}

function pickAudioURL(info) {
  if (info?.url) return info.url;

  const audioFormat = info?.formats
    ?.filter(f => f?.url && f?.acodec && f.acodec !== 'none')
    ?.sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0];

  return audioFormat?.url ?? null;
}

export function getMusicDiagnostics() {
  return {
    ytdlpBin: YTDLP_BIN,
    cookiesDetected: Boolean(COOKIES_PATH),
    cookieSource,
    cookiesPath: COOKIES_PATH ? '[configured]' : null,
  };
}

// Construye un objeto Song de DisTube desde el JSON de yt-dlp
function makeSong(plugin, info, options) {
  return new Song({
    plugin,
    source:        info.extractor || 'youtube',
    playFromSource: true,
    id:            info.id,
    name:          info.title || info.fulltitle || 'Desconocido',
    url:           info.webpage_url || info.original_url,
    isLive:        !!info.is_live,
    thumbnail:     info.thumbnail ?? info.thumbnails?.[0]?.url ?? null,
    duration:      info.is_live ? 0 : (info.duration ?? 0),
    uploader:      { name: info.uploader ?? null, url: info.uploader_url ?? null },
    views:         info.view_count  ?? 0,
    likes:         info.like_count  ?? 0,
    dislikes:      info.dislike_count ?? 0,
    reposts:       info.repost_count ?? 0,
    ageRestricted: Boolean(info.age_limit) && info.age_limit >= 18,
  }, options);
}

// Parchea el plugin en tiempo de ejecución para inyectar nuestros flags
// (no depende del postinstall, funciona en cualquier entorno)
function patchYtDlpPlugin(plugin) {
  plugin.resolve = async function(url, options) {
    const info = await runYtDlpJson(url).catch(e => { throw normalizeYtDlpError(e); });

    if (Array.isArray(info.entries)) {
      if (!info.entries.length) throw new Error('La playlist está vacía.');
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

  plugin.getStreamURL = async function(song) {
    if (!song.url) throw new Error('URL de canción inválida.');
    const info = await runYtDlpJson(song.url, { format: AUDIO_FORMAT }).catch(e => { throw normalizeYtDlpError(e); });
    if (Array.isArray(info.entries)) throw new Error('No se puede reproducir una playlist completa directamente.');
    const streamURL = pickAudioURL(info);
    if (!streamURL) throw new Error('No se encontro un formato de audio reproducible para este video.');
    return streamURL;
  };
}

// Limpia URLs de YouTube Radio/Mix (list=RD...) dejando solo el video
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

// Resuelve texto a URL de YouTube, o pasa la URL directa limpia
export function resolvePlayQuery(raw) {
  try {
    const u = new URL(raw);
    if (['http:', 'https:'].includes(u.protocol)) {
      return Promise.resolve(cleanYouTubeURL(raw));
    }
  } catch { /* not a URL */ }

  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch1:${raw}`,
      '--print', 'webpage_url',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=android_vr,tv_embedded',
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
      else reject(new Error(err.trim() || 'No se encontró ninguna canción'));
    });
    proc.on('error', reject);
  });
}

let distube;

export function getDistube() {
  return distube;
}

export function initMusic(client) {
  const ytdlpPlugin = new YtDlpPlugin({ update: process.platform !== 'win32' });
  patchYtDlpPlugin(ytdlpPlugin); // ← inyecta cookies + player_client en runtime

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

  logger.info('Sistema de música inicializado (DisTube v5 + yt-dlp).');
  return distube;
}
