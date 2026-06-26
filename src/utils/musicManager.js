import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { EmbedBuilder } from 'discord.js';
import { spawn } from 'child_process';
import { join } from 'path';
import { logger } from './logger.js';
import ffmpegPath from 'ffmpeg-static';

const YTDLP_BIN = process.env.YTDLP_PATH || join(
  process.cwd(),
  'node_modules/@distube/yt-dlp/bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
);

// Limpia URLs de YouTube Radio/Mix (list=RD...) dejando solo el video
function cleanYouTubeURL(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      const list = u.searchParams.get('list') ?? '';
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
    const proc = spawn(YTDLP_BIN, [
      `ytsearch1:${raw}`,
      '--print', 'webpage_url',
      '--no-warnings',
    ]);
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
  distube = new DisTube(client, {
    ffmpeg: { path: ffmpegPath },
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [new YtDlpPlugin({ update: process.platform !== 'win32' })],
  });

  distube.on('playSong', (queue, song) => {
    const requestedBy = song.user ?? song.requestedBy;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Reproduciendo ahora')
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: '⏱️ Duración', value: song.formattedDuration ?? '0:00', inline: true },
        { name: '🔊 Volumen', value: `${queue.volume}%`, inline: true },
        { name: '👤 Solicitado por', value: requestedBy?.toString() ?? 'Desconocido', inline: true },
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
