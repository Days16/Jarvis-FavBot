import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embedBuilder.js';
import {
  getShoukaku, getQueue, getPlayer, getOrCreatePlayer,
  searchTracks, ensureQueue, destroyQueue,
  RepeatMode, formatDuration, isLavalinkReady,
} from '../../utils/musicManager.js';
import { getGuild, ensureGuild, updateGuild } from '../../models/Guild.js';
import { setConfig } from '../../models/BotConfig.js';

// ── Helpers de canción (wrapper sobre la estructura de Lavalink) ──────
const sName  = s => s.track.info.title;
const sUrl   = s => s.track.info.uri ?? '#';
const sDurMs = s => s.track.info.length ?? 0;
const sFmt   = s => s.track.info.isStream ? '∞' : formatDuration(sDurMs(s) / 1000);
const sThumb = s => s.track.info.artworkUrl ?? null;

function progressBar(currentMs, totalMs, len = 18) {
  if (!totalMs) return '░'.repeat(len);
  const filled = Math.min(len, Math.round((currentMs / totalMs) * len));
  return '▓'.repeat(filled) + '░'.repeat(len - filled);
}

export default {
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Control del reproductor de música')

    .addSubcommand(s => s
      .setName('play')
      .setDescription('Reproduce o añade una canción/playlist a la cola')
      .addStringOption(o => o.setName('busqueda').setDescription('URL o nombre de canción (YouTube, SoundCloud…)').setRequired(true)))

    .addSubcommand(s => s.setName('stop').setDescription('Para la música y limpia la cola'))
    .addSubcommand(s => s.setName('skip').setDescription('Salta a la siguiente canción'))
    .addSubcommand(s => s.setName('pause').setDescription('Pausa la reproducción'))
    .addSubcommand(s => s.setName('resume').setDescription('Reanuda la reproducción'))
    .addSubcommand(s => s.setName('queue').setDescription('Muestra la cola de reproducción'))
    .addSubcommand(s => s.setName('nowplaying').setDescription('Canción en reproducción ahora'))
    .addSubcommand(s => s.setName('diagnostico').setDescription('Estado del sistema de música'))

    .addSubcommand(s => s
      .setName('volume')
      .setDescription('Ajusta el volumen')
      .addIntegerOption(o => o.setName('nivel').setDescription('Volumen (0–100)').setMinValue(0).setMaxValue(100).setRequired(true)))

    .addSubcommand(s => s
      .setName('loop')
      .setDescription('Modo de repetición')
      .addStringOption(o => o.setName('modo').setDescription('Modo').setRequired(true)
        .addChoices(
          { name: '❌ Sin bucle',            value: '0' },
          { name: '🔂 Repetir canción',      value: '1' },
          { name: '🔁 Repetir toda la cola', value: '2' },
        )))

    .addSubcommand(s => s.setName('shuffle').setDescription('Mezcla aleatoriamente la cola'))

    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Elimina una canción de la cola')
      .addIntegerOption(o => o.setName('posicion').setDescription('Posición (1 = primera en espera)').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s
      .setName('jump')
      .setDescription('Salta a una posición de la cola')
      .addIntegerOption(o => o.setName('posicion').setDescription('Posición (1 = primera en espera)').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s
      .setName('node')
      .setDescription('Configura el nodo Lavalink (solo admins)')
      .addStringOption(o => o.setName('host').setDescription('Host del nodo (ej: lava.ejemplo.com)').setRequired(true))
      .addStringOption(o => o.setName('pass').setDescription('Contraseña del nodo').setRequired(true))
      .addIntegerOption(o => o.setName('port').setDescription('Puerto (defecto: 2333)').setMinValue(1).setMaxValue(65535))
      .addBooleanOption(o => o.setName('ssl').setDescription('¿Usar SSL? (defecto: false)')))

    .addSubcommand(s => s
      .setName('canal')
      .setDescription('Canal de texto para comandos de música (solo admins)')
      .addChannelOption(o => o.setName('canal').setDescription('Canal (vacío = cualquiera)').addChannelTypes(ChannelType.GuildText)))

    .addSubcommand(s => s
      .setName('vocales')
      .setDescription('Canal de voz donde puede reproducir (solo admins)')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de voz (vacío = cualquiera)').addChannelTypes(ChannelType.GuildVoice))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const vc  = interaction.member?.voice?.channel;

    // ── /music node — guardar config Lavalink ─────────────────
    if (sub === 'node') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [errorEmbed('Necesitas **Gestionar Servidor**.')], flags: 64 });

      await interaction.deferReply({ flags: 64 });
      const host = interaction.options.getString('host');
      const pass = interaction.options.getString('pass');
      const port = interaction.options.getInteger('port') ?? 2333;
      const ssl  = interaction.options.getBoolean('ssl')  ?? false;
      await setConfig('lavalink_host',   host);
      await setConfig('lavalink_pass',   pass);
      await setConfig('lavalink_port',   String(port));
      await setConfig('lavalink_secure', String(ssl));
      return interaction.editReply({
        embeds: [successEmbed(
          '🎵 Nodo Lavalink guardado',
          `Host: \`${host}:${port}\` (SSL: ${ssl ? 'sí' : 'no'})\n⚠️ Reinicia el bot para conectar al nodo.`,
        )],
      });
    }

    // ── /music canal ──────────────────────────────────────────
    if (sub === 'canal') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [errorEmbed('Necesitas **Gestionar Servidor**.')], flags: 64 });
      const canal = interaction.options.getChannel('canal');
      const gd    = await ensureGuild(interaction.guild.id);
      await updateGuild(interaction.guild.id, { channels: { ...(gd.channels ?? {}), music: canal?.id ?? null } });
      return interaction.reply({
        embeds: [successEmbed('📝 Canal de música', canal ? `Solo en ${canal}.` : 'Cualquier canal de texto.')],
        flags: 64,
      });
    }

    // ── /music vocales ────────────────────────────────────────
    if (sub === 'vocales') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [errorEmbed('Necesitas **Gestionar Servidor**.')], flags: 64 });
      const canal = interaction.options.getChannel('canal');
      const gd    = await ensureGuild(interaction.guild.id);
      await updateGuild(interaction.guild.id, { channels: { ...(gd.channels ?? {}), musicVoice: canal?.id ?? null } });
      return interaction.reply({
        embeds: [successEmbed('🔊 Canal de voz', canal ? `Solo en ${canal}.` : 'Cualquier canal de voz.')],
        flags: 64,
      });
    }

    // ── /music diagnostico ────────────────────────────────────
    if (sub === 'diagnostico') {
      const sh    = getShoukaku();
      const nodes = sh ? [...sh.nodes.values()] : [];
      const nodeInfo = nodes.length
        ? nodes.map(n => `• \`${n.name}\` — ${n.stats ? `✅ Listo · ${n.stats.players ?? 0} players` : '⚠️ Conectando'}`).join('\n')
        : '❌ Sin nodo configurado\nUsa `/music node` para añadir uno.';
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(sh ? 0x57f287 : 0xed4245)
          .setTitle('🔧 Sistema de música — Lavalink')
          .addFields({ name: 'Nodos', value: nodeInfo })
          .setFooter({ text: 'Lavalink gestiona el streaming de YouTube y SoundCloud.' })],
        flags: 64,
      });
    }

    // ── Guard: Lavalink debe estar listo ──────────────────────
    if (!isLavalinkReady()) {
      return interaction.reply({
        embeds: [errorEmbed('Sistema de música no disponible.\nConfigura un nodo con `/music node` y reinicia el bot.\n\n[Encontrar nodos gratuitos →](https://github.com/lavalink-devs/lavalink-list)')],
        flags: 64,
      });
    }

    const guildData      = await getGuild(interaction.guild.id);
    const musicChannelId = guildData?.channels?.music;
    if (musicChannelId && interaction.channel.id !== musicChannelId) {
      return interaction.reply({
        embeds: [errorEmbed(`Comandos de música solo en <#${musicChannelId}>.`)],
        flags: 64,
      });
    }

    // ── /music play ───────────────────────────────────────────
    if (sub === 'play') {
      if (!vc) return interaction.reply({ embeds: [errorEmbed('Debes estar en un canal de voz.')], flags: 64 });

      const musicVoiceId = guildData?.channels?.musicVoice;
      if (musicVoiceId && vc.id !== musicVoiceId)
        return interaction.reply({ embeds: [errorEmbed(`El bot solo reproduce en <#${musicVoiceId}>. Únete a ese canal.`)], flags: 64 });

      const me = interaction.guild.members.me;
      if (!vc.permissionsFor(me).has(['Connect', 'Speak']))
        return interaction.reply({ embeds: [errorEmbed('Sin permiso para conectarme o hablar en ese canal.')], flags: 64 });

      const raw = interaction.options.getString('busqueda');
      await interaction.deferReply();
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`🔍 Buscando **${raw}**…`)] });

      let result;
      try { result = await searchTracks(raw); }
      catch (err) { return interaction.editReply({ embeds: [errorEmbed(err.message)] }); }

      if (!result || result.loadType === 'empty')
        return interaction.editReply({ embeds: [errorEmbed(`Sin resultados para **${raw}**.`)] });
      if (result.loadType === 'error')
        return interaction.editReply({ embeds: [errorEmbed(`Error Lavalink: ${result.data?.message ?? 'desconocido'}`)] });

      let player;
      try { player = await getOrCreatePlayer(interaction.guild, vc.id); }
      catch (err) { return interaction.editReply({ embeds: [errorEmbed(err.message)] }); }

      const queue     = ensureQueue(interaction.guild.id, interaction.channel, vc.id);
      const wasEmpty  = queue.songs.length === 0;

      if (result.loadType === 'playlist') {
        for (const t of result.data.tracks)
          queue.songs.push({ track: t, requestedBy: interaction.member });
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(`✅ Playlist **${result.data.info.name}** — **${result.data.tracks.length}** canciones añadidas.`)],
        });
      } else {
        const track = result.loadType === 'search' ? result.data[0] : result.data;
        queue.songs.push({ track, requestedBy: interaction.member });
        if (!wasEmpty) {
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor(0x57f287)
              .setDescription(`✅ **[${track.info.title}](${track.info.uri ?? '#'})** — posición **${queue.songs.length}**.`)
              .setThumbnail(track.info.artworkUrl ?? null)],
          });
        } else {
          await interaction.deleteReply().catch(() => {});
        }
      }

      if (wasEmpty) {
        const first = queue.songs[0];
        await player.playTrack({ track: { encoded: first.track.encoded } });
        player.setGlobalVolume(queue.volume);
      }
      return;
    }

    // ── El resto requiere cola activa ─────────────────────────
    const queue  = getQueue(interaction.guild.id);
    const player = getPlayer(interaction.guild.id);
    if (!queue || !player)
      return interaction.reply({ embeds: [errorEmbed('No hay música reproduciéndose actualmente.')], flags: 64 });

    // ── stop ─────────────────────────────────────────────────
    if (sub === 'stop') {
      destroyQueue(interaction.guild.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('⏹️ Música detenida y cola limpiada.')] });
    }

    // ── skip ─────────────────────────────────────────────────
    if (sub === 'skip') {
      const current = queue.songs[0];
      const hasNext = queue.songs.length > 1 || queue.loop === RepeatMode.QUEUE;
      if (!hasNext) {
        destroyQueue(interaction.guild.id);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`⏭️ **${sName(current)}** — sin más canciones.`)] });
      }
      await player.stopTrack().catch(() => {});
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`⏭️ Saltando **${sName(current)}**…`)] });
    }

    // ── pause ─────────────────────────────────────────────────
    if (sub === 'pause') {
      if (player.paused) return interaction.reply({ embeds: [errorEmbed('La música ya está pausada.')], flags: 64 });
      await player.setPaused(true);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⏸️ Música pausada.')], flags: 64 });
    }

    // ── resume ────────────────────────────────────────────────
    if (sub === 'resume') {
      if (!player.paused) return interaction.reply({ embeds: [errorEmbed('La música no está pausada.')], flags: 64 });
      await player.setPaused(false);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('▶️ Música reanudada.')], flags: 64 });
    }

    // ── queue ─────────────────────────────────────────────────
    if (sub === 'queue') {
      const songs      = queue.songs;
      const current    = songs[0];
      const next       = songs.slice(1, 11);
      const totalS     = songs.reduce((a, s) => a + sDurMs(s) / 1000, 0);
      const loopLabels = ['Sin bucle', '🔂 Canción', '🔁 Cola'];
      const lines      = next.length
        ? next.map((s, i) => `\`${i + 1}.\` [${sName(s)}](${sUrl(s)}) — \`${sFmt(s)}\``)
        : ['*(no hay más canciones)*'];

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎵 Cola de reproducción')
        .setDescription(`▶️ **[${sName(current)}](${sUrl(current)})** — \`${sFmt(current)}\`\n\n**Próximas:**\n${lines.join('\n')}`)
        .addFields(
          { name: '🎶 Canciones',      value: `${songs.length}`,                inline: true },
          { name: '⏱️ Duración total', value: formatDuration(totalS),           inline: true },
          { name: '🔁 Bucle',          value: loopLabels[queue.loop] ?? 'Sin bucle', inline: true },
          { name: '🔊 Volumen',        value: `${queue.volume}%`,               inline: true },
        );
      if (songs.length > 11) embed.setFooter({ text: `... y ${songs.length - 11} más` });
      return interaction.reply({ embeds: [embed] });
    }

    // ── nowplaying ────────────────────────────────────────────
    if (sub === 'nowplaying') {
      const song = queue.songs[0];
      if (!song) return interaction.reply({ embeds: [errorEmbed('No hay canción reproduciéndose.')], flags: 64 });

      const posMs      = player.position ?? 0;
      const durMs      = sDurMs(song);
      const bar        = progressBar(posMs, durMs);
      const loopLabels = ['Desactivado', '🔂 Canción', '🔁 Cola'];

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🎵 Reproduciendo ahora')
          .setDescription(`[${sName(song)}](${sUrl(song)})`)
          .addFields(
            {
              name:   '⏱️ Progreso',
              value:  song.track.info.isStream
                ? '🔴 En vivo'
                : `\`${formatDuration(posMs / 1000)}\` ${bar} \`${sFmt(song)}\``,
              inline: false,
            },
            { name: '🔊 Volumen',        value: `${queue.volume}%`,                         inline: true },
            { name: '🔁 Bucle',          value: loopLabels[queue.loop] ?? 'Desactivado',    inline: true },
            { name: '👤 Solicitado por', value: song.requestedBy?.toString() ?? 'Desconocido', inline: true },
          )
          .setThumbnail(sThumb(song))
          .setFooter({ text: `${queue.songs.length} canciones en cola` })],
      });
    }

    // ── volume ────────────────────────────────────────────────
    if (sub === 'volume') {
      const nivel    = interaction.options.getInteger('nivel');
      queue.volume   = nivel;
      player.setGlobalVolume(nivel);
      const icon = nivel === 0 ? '🔇' : nivel < 40 ? '🔈' : nivel < 75 ? '🔉' : '🔊';
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`${icon} Volumen ajustado a **${nivel}%**`)],
        flags: 64,
      });
    }

    // ── loop ──────────────────────────────────────────────────
    if (sub === 'loop') {
      const modo  = parseInt(interaction.options.getString('modo'), 10);
      queue.loop  = modo;
      const labels = ['❌ Sin bucle', '🔂 Repitiendo canción', '🔁 Repitiendo cola'];
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`Modo: **${labels[modo] ?? 'desconocido'}**`)],
        flags: 64,
      });
    }

    // ── shuffle ───────────────────────────────────────────────
    if (sub === 'shuffle') {
      const current = queue.songs.shift();
      for (let i = queue.songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
      }
      queue.songs.unshift(current);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription('🔀 Cola mezclada aleatoriamente.')],
        flags: 64,
      });
    }

    // ── remove ────────────────────────────────────────────────
    if (sub === 'remove') {
      const pos = interaction.options.getInteger('posicion');
      if (pos >= queue.songs.length)
        return interaction.reply({ embeds: [errorEmbed(`Solo hay **${queue.songs.length - 1}** canciones en espera.`)], flags: 64 });
      const [removed] = queue.songs.splice(pos, 1);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`🗑️ Eliminada: **${sName(removed)}**`)],
        flags: 64,
      });
    }

    // ── jump ──────────────────────────────────────────────────
    if (sub === 'jump') {
      const pos = interaction.options.getInteger('posicion');
      if (pos >= queue.songs.length)
        return interaction.reply({ embeds: [errorEmbed(`Solo hay **${queue.songs.length - 1}** canciones en espera.`)], flags: 64 });
      const target = queue.songs[pos];
      queue.songs.splice(1, pos - 1); // eliminar canciones entre la actual y el objetivo
      await player.stopTrack().catch(() => {}); // 'end' handler avanza la cola → reproduce target
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`⏩ Saltando a: **${sName(target)}**`)],
        flags: 64,
      });
    }
  },
};
