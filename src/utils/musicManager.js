import { DisTube, Song, Playlist } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { SoundCloudPlugin } from '@distube/soundcloud';
import { EmbedBuilder } from 'discord.js';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import axios from 'axios';
import { logger } from './logger.js';
import ffmpegPath from 'ffmpeg-static';

// ── Binario yt-dlp ────────────────────────────────────────────────────
const YTDLP_BIN = process.env.YTDLP_PATH || join(
  process.cwd(),
  'node_modules/@distube/yt-dlp/bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
);

// ── Cookies opcionales ────────────────────────────────────────────────
const COOKIES_PATH = (() => {
  const envVal = process.env.YTDLP_COOKIES;
  if (envVal) {
    const abs = /^([A-Za-z]:\\|\/)/.test(envVal) ? envVal : join(process.cwd(), envVal);
    if (existsSync(abs)) return abs;
  }
  const auto = join(process.cwd(), 'cookies.txt');
  return existsSync(auto) ? auto : null;
})();
if (COOKIES_PATH) logger.info(`[Music] Cookies: ${COOKIES_PATH}`);

// ── Helpers URL ───────────────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be'))   return u.pathname.slice(1).split('?')[0];
  } catch { /* noop */ }
  return null;
}

function isYouTubeURL(raw) { return !!extractVideoId(raw); }

function cleanYouTubeURL(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      const list = u.searchParams.get('list') ?? '';
      if (u.searchParams.get('start_radio') === '1' || list.startsWith('RD'))
        return `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`;
    }
  } catch { /* noop */ }
  return url;
}

// ── cobalt.tools — obtiene URL de audio de YouTube sin tocar sus servidores
async function cobaltGetAudioUrl(youtubeUrl) {
  const { data } = await axios.post(
    'https://api.cobalt.tools/',
    { url: youtubeUrl, downloadMode: 'audio', audioFormat: 'opus' },
    {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 20000,
    },
  );
  if (data.status === 'error') throw new Error(`cobalt: ${data.error?.code ?? 'error'}`);
  if (!data.url) throw new Error('cobalt no devolvió URL de audio');
  return data.url;
}

// ── YouTube oEmbed — metadatos sin API key ────────────────────────────
async function youtubeOEmbed(url) {
  const { data } = await axios.get(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { timeout: 8000 },
  );
  return data; // { title, author_name, author_url, thumbnail_url }
}

function ytdlpJson(url, flags) {
  return new Promise((resolve, reject) => {
    const flagArgs = Object.entries(flags).flatMap(([k, v]) => {
      const key = '--' + k.replace(/([A-Z])/g, '-$1').toLowerCase();
      return v === true ? [key] : v === false ? [] : [key, String(v)];
    });
    const proc = spawn(YTDLP_BIN, [url, ...flagArgs]);
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (code === 0) { try { resolve(JSON.parse(out)); } catch (e) { reject(e); } }
      else reject(new Error(err.trim() || out.trim()));
    });
    proc.on('error', reject);
  });
}

// ── Construye Song desde oEmbed ───────────────────────────────────────
function makeSongFromOEmbed(plugin, videoId, oembed, options) {
  return new Song({
    plugin,
    source:         'youtube',
    playFromSource: true,
    id:             videoId,
    name:           oembed.title || 'YouTube Video',
    url:            `https://www.youtube.com/watch?v=${videoId}`,
    isLive:         false,
    thumbnail:      oembed.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration:       0,
    uploader:       { name: oembed.author_name ?? null, url: oembed.author_url ?? null },
    views:          0,
    likes:          0,
  }, options);
}

// ── Construye Song desde JSON de yt-dlp ──────────────────────────────
function makeSongFromYtdlp(plugin, info, options) {
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
    views:          info.view_count ?? 0,
    likes:          info.like_count ?? 0,
  }, options);
}

// ── Parche runtime del plugin YtDlp ──────────────────────────────────
function patchYtDlpPlugin(plugin) {

  plugin.resolve = async function(url, options) {
    const videoId = extractVideoId(url);

    // YouTube → intentar cobalt.tools primero (funciona en servidores)
    if (videoId) {
      try {
        const oembed = await youtubeOEmbed(url);
        return makeSongFromOEmbed(plugin, videoId, oembed, options);
      } catch { /* silenciar — caer a yt-dlp */ }
    }

    // Fallback: yt-dlp (funciona en local, puede fallar en servidores cloud)
    const info = await ytdlpJson(url, {
      dumpSingleJson: true, noWarnings: true,
      preferFreeFormats: true, skipDownload: true, simulate: true,
      extractorArgs: 'youtube:player_client=android_vr,tv_embedded',
      ...(COOKIES_PATH ? { cookies: COOKIES_PATH } : {}),
    }).catch(e => { throw new Error(String(e)); });

    if (Array.isArray(info.entries)) {
      if (!info.entries.length) throw new Error('La playlist está vacía.');
      return new Playlist({
        source: info.extractor, songs: info.entries.map(i => makeSongFromYtdlp(plugin, i, options)),
        id: String(info.id), name: info.title,
        url: info.webpage_url, thumbnail: info.thumbnails?.[0]?.url ?? null,
      }, options);
    }
    return makeSongFromYtdlp(plugin, info, options);
  };

  plugin.getStreamURL = async function(song) {
    if (!song.url) throw new Error('URL de canción inválida.');

    // YouTube → cobalt.tools (funciona en servidores cloud)
    if (isYouTubeURL(song.url)) {
      try {
        const streamUrl = await cobaltGetAudioUrl(song.url);
        logger.info(`[Music] cobalt.tools OK → ${song.name}`);
        return streamUrl;
      } catch (cobaltErr) {
        logger.warn(`[Music] cobalt.tools falló (${cobaltErr.message}), intentando yt-dlp...`);
      }
    }

    // Fallback: yt-dlp
    const info = await ytdlpJson(song.url, {
      dumpSingleJson: true, noWarnings: true,
      preferFreeFormats: true, skipDownload: true, simulate: true, format: 'ba/ba*',
      extractorArgs: 'youtube:player_client=android_vr,tv_embedded',
      ...(COOKIES_PATH ? { cookies: COOKIES_PATH } : {}),
    }).catch(e => { throw new Error(String(e)); });
    if (Array.isArray(info.entries)) throw new Error('No se puede reproducir una playlist completa.');
    return info.url;
  };
}

// ── resolvePlayQuery ──────────────────────────────────────────────────
// Devuelve: URL limpia (YouTube/SC/otra) o null (texto → SoundCloud vía DisTube)
export async function resolvePlayQuery(raw) {
  const trimmed = raw.trim();
  if (isYouTubeURL(trimmed)) return cleanYouTubeURL(trimmed);
  try { new URL(trimmed); return trimmed; } catch { /* texto */ }
  return null; // SoundCloud plugin lo resuelve internamente
}

let distube;
export function getDistube() { return distube; }

export function initMusic(client) {
  const ytdlpPlugin = new YtDlpPlugin({ update: process.platform !== 'win32' });
  patchYtDlpPlugin(ytdlpPlugin);

  distube = new DisTube(client, {
    ffmpeg: { path: ffmpegPath },
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [
      new SoundCloudPlugin(), // búsquedas de texto + URLs de SoundCloud
      ytdlpPlugin,            // URLs de YouTube (cobalt.tools) + otras URLs
    ],
  });

  distube.on('playSong', (queue, song) => {
    const requestedBy = song.user ?? song.requestedBy;
    queue.textChannel?.send({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎵 Reproduciendo ahora')
        .setDescription(`[${song.name}](${song.url})`)
        .addFields(
          { name: '⏱️ Duración',      value: song.formattedDuration ?? '?',         inline: true },
          { name: '🔊 Volumen',        value: `${queue.volume}%`,                    inline: true },
          { name: '👤 Solicitado por', value: requestedBy?.toString() ?? '?',        inline: true },
        )
        .setThumbnail(song.thumbnail ?? null)],
    }).catch(() => {});
  });

  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ **[${song.name}](${song.url})** añadida — posición **${queue.songs.length}**.`)
        .setThumbnail(song.thumbnail ?? null)],
    }).catch(() => {});
  });

  distube.on('addList', (queue, playlist) => {
    queue.textChannel?.send({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ Playlist **${playlist.name}** — **${playlist.songs.length}** canciones.`)],
    }).catch(() => {});
  });

  distube.on('error', (error, queue) => {
    logger.error('[DisTube]', error?.message ?? String(error));
    queue?.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`❌ Error: ${error?.message ?? 'Desconocido'}`)],
    }).catch(() => {});
  });

  distube.on('finish', queue => {
    queue.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⏹️ Cola terminada.')],
    }).catch(() => {});
  });

  distube.on('empty', queue => {
    queue.textChannel?.send({
      embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('📢 Canal vacío, desconectando.')],
    }).catch(() => {});
  });

  distube.on('initQueue', queue => { queue.setVolume(80); });

  logger.info('Sistema de música inicializado (cobalt.tools + SoundCloud + yt-dlp).');
  return distube;
}
