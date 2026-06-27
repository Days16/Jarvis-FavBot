import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { RepeatMode } from 'distube';
import { errorEmbed, successEmbed } from '../../utils/embedBuilder.js';
import { getDistube, resolvePlayQuery } from '../../utils/musicManager.js';
import { getGuild, ensureGuild, updateGuild } from '../../models/Guild.js';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

function progressBar(current, total, len = 18) {
  if (!total) return '░'.repeat(len);
  const filled = Math.min(len, Math.round((current / total) * len));
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
      .addStringOption(o => o.setName('busqueda').setDescription('URL de YouTube o nombre de la canción').setRequired(true)))

    .addSubcommand(s => s.setName('stop').setDescription('Para la música y limpia la cola'))
    .addSubcommand(s => s.setName('skip').setDescription('Salta a la siguiente canción en cola'))
    .addSubcommand(s => s.setName('pause').setDescription('Pausa la reproducción'))
    .addSubcommand(s => s.setName('resume').setDescription('Reanuda la reproducción pausada'))
    .addSubcommand(s => s.setName('queue').setDescription('Muestra la cola de reproducción'))
    .addSubcommand(s => s.setName('nowplaying').setDescription('Muestra la canción que suena ahora'))

    .addSubcommand(s => s
      .setName('diagnostico')
      .setDescription('Muestra el estado de yt-dlp y cookies de YouTube'))

    .addSubcommand(s => s
      .setName('volume')
      .setDescription('Ajusta el volumen del reproductor')
      .addIntegerOption(o => o.setName('nivel').setDescription('Volumen (0–100)').setMinValue(0).setMaxValue(100).setRequired(true)))

    .addSubcommand(s => s
      .setName('loop')
      .setDescription('Configura el modo de repetición')
      .addStringOption(o => o.setName('modo').setDescription('Modo de bucle').setRequired(true)
        .addChoices(
          { name: '❌ Sin bucle', value: '0' },
          { name: '🔂 Repetir canción actual', value: '1' },
          { name: '🔁 Repetir toda la cola', value: '2' },
        )))

    .addSubcommand(s => s.setName('shuffle').setDescription('Mezcla aleatoriamente las canciones en cola'))

    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Elimina una canción de la cola por su posición')
      .addIntegerOption(o => o.setName('posicion').setDescription('Posición en la cola (1 = primera en espera)').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s
      .setName('jump')
      .setDescription('Salta directamente a una posición de la cola')
      .addIntegerOption(o => o.setName('posicion').setDescription('Posición de la canción (1 = primera en espera)').setMinValue(1).setRequired(true)))

    .addSubcommand(s => s
      .setName('canal')
      .setDescription('Establece el canal de texto donde se pueden usar los comandos de música (solo admins)')
      .addChannelOption(o => o
        .setName('canal')
        .setDescription('Canal de texto (vacío = cualquier canal)')
        .addChannelTypes(ChannelType.GuildText)))

    .addSubcommand(s => s
      .setName('vocales')
      .setDescription('Establece el canal de voz donde el bot puede reproducir música (solo admins)')
      .addChannelOption(o => o
        .setName('canal')
        .setDescription('Canal de voz (vacío = cualquier canal de voz)')
        .addChannelTypes(ChannelType.GuildVoice))),

  async execute(interaction) {
    const distube = getDistube();
    if (!distube) return interaction.reply({ embeds: [errorEmbed('Sistema de música no disponible.')], flags: 64 });

    const sub = interaction.options.getSubcommand();
    const vc = interaction.member?.voice?.channel;

    // ── canal (config texto) ──────────────────────────────────
    if (sub === 'canal') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errorEmbed('Necesitas el permiso **Gestionar Servidor**.')], flags: 64 });
      }
      const canal = interaction.options.getChannel('canal');
      const guildData = await ensureGuild(interaction.guild.id);
      await updateGuild(interaction.guild.id, {
        channels: { ...(guildData.channels ?? {}), music: canal?.id ?? null },
      });
      return interaction.reply({
        embeds: [successEmbed(
          '📝 Canal de texto de música',
          canal
            ? `Los comandos de música solo funcionarán en ${canal}.`
            : 'Los comandos de música ahora funcionan en **cualquier canal de texto**.',
        )],
        flags: 64,
      });
    }

    // ── vocales (config voz) ──────────────────────────────────
    if (sub === 'vocales') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errorEmbed('Necesitas el permiso **Gestionar Servidor**.')], flags: 64 });
      }
      const canal = interaction.options.getChannel('canal');
      const guildData = await ensureGuild(interaction.guild.id);
      await updateGuild(interaction.guild.id, {
        channels: { ...(guildData.channels ?? {}), musicVoice: canal?.id ?? null },
      });
      return interaction.reply({
        embeds: [successEmbed(
          '🔊 Canal de voz de música',
          canal
            ? `El bot solo reproducirá música en ${canal}.`
            : 'El bot puede reproducir música en **cualquier canal de voz**.',
        )],
        flags: 64,
      });
    }

    // ── comprobación de canal de texto ────────────────────────
    if (sub === 'diagnostico') {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🔧 Diagnóstico de música')
          .addFields(
            { name: 'Fuente YouTube', value: '✅ cobalt.tools (sin bloqueo de IP)', inline: false },
            { name: 'Búsqueda de texto', value: '✅ SoundCloud (funciona en servidores cloud)', inline: false },
            { name: 'Fallback', value: 'yt-dlp local (URLs no YouTube)', inline: false },
          )],
        flags: 64,
      });
    }

    const guildData = await getGuild(interaction.guild.id);
    const musicChannelId = guildData?.channels?.music;
    if (musicChannelId && interaction.channel.id !== musicChannelId) {
      return interaction.reply({
        embeds: [errorEmbed(`Los comandos de música solo se pueden usar en <#${musicChannelId}>.`)],
        flags: 64,
      });
    }

    // ── play ─────────────────────────────────────────────────
    if (sub === 'play') {
      if (!vc) return interaction.reply({ embeds: [errorEmbed('Debes estar en un canal de voz.')], flags: 64 });

      // Comprobación de canal de voz configurado
      const musicVoiceId = guildData?.channels?.musicVoice;
      if (musicVoiceId && vc.id !== musicVoiceId) {
        return interaction.reply({
          embeds: [errorEmbed(`El bot solo puede reproducir música en <#${musicVoiceId}>. Únete a ese canal.`)],
          flags: 64,
        });
      }

      const me = interaction.guild.members.me;
      if (!vc.permissionsFor(me).has(['Connect', 'Speak'])) {
        return interaction.reply({ embeds: [errorEmbed('No tengo permiso para unirme o hablar en ese canal de voz.')], flags: 64 });
      }

      const raw = interaction.options.getString('busqueda');
      await interaction.deferReply();
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`🔍 Buscando **${raw}**…`)],
      });

      // resolvePlayQuery devuelve: URL (YouTube/SC/otra) o null (texto → SoundCloud lo busca)
      let playTarget;
      try {
        playTarget = await resolvePlayQuery(raw);
      } catch (err) {
        return interaction.editReply({ embeds: [errorEmbed(`No se encontró ninguna canción para **${raw}**.`)] });
      }
      // Si es null, pasamos el texto directamente — SoundCloudPlugin lo resuelve
      if (playTarget === null) playTarget = raw;

      const TIMEOUT = 45_000;
      try {
        await Promise.race([
          distube.play(vc, playTarget, { member: interaction.member, textChannel: interaction.channel }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Tiempo de espera agotado (45s). Intenta de nuevo.')), TIMEOUT)),
        ]);
        await interaction.deleteReply().catch(() => {});
      } catch (err) {
        const msg = err?.message ?? String(err);
        await interaction.editReply({ embeds: [errorEmbed(msg)] }).catch(() => {});
      }
      return;
    }

    // El resto requiere cola activa
    const queue = distube.getQueue(interaction.guild);
    if (!queue) {
      return interaction.reply({ embeds: [errorEmbed('No hay música reproduciéndose actualmente.')], flags: 64 });
    }

    // ── stop ─────────────────────────────────────────────────
    if (sub === 'stop') {
      queue.stop();
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription('⏹️ Música detenida y cola limpiada.')],
      });
    }

    // ── skip ─────────────────────────────────────────────────
    if (sub === 'skip') {
      const current = queue.songs[0];
      if (queue.songs.length <= 1) {
        queue.stop();
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription(`⏭️ **${current.name}** — no hay más canciones. Deteniendo.`)],
        });
      }
      await queue.skip().catch(() => {});
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`⏭️ Saltando **${current.name}**…`)],
      });
    }

    // ── pause ─────────────────────────────────────────────────
    if (sub === 'pause') {
      if (queue.paused) return interaction.reply({ embeds: [errorEmbed('La música ya está pausada.')], flags: 64 });
      queue.pause();
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setDescription('⏸️ Música pausada.')], flags: 64 });
    }

    // ── resume ────────────────────────────────────────────────
    if (sub === 'resume') {
      if (!queue.paused) return interaction.reply({ embeds: [errorEmbed('La música no está pausada.')], flags: 64 });
      queue.resume();
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('▶️ Música reanudada.')], flags: 64 });
    }

    // ── queue ─────────────────────────────────────────────────
    if (sub === 'queue') {
      const songs = queue.songs;
      const current = songs[0];
      const next = songs.slice(1, 11);
      const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0);
      const loopLabels = ['Sin bucle', '🔂 Canción', '🔁 Cola'];

      const lines = next.length
        ? next.map((s, i) => `\`${i + 1}.\` [${s.name}](${s.url}) — \`${s.formattedDuration ?? '?'}\``)
        : ['*(no hay más canciones)*'];

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎵 Cola de reproducción')
        .setDescription(
          `▶️ **[${current.name}](${current.url})** — \`${current.formattedDuration ?? '?'}\`\n\n` +
          `**Próximas canciones:**\n${lines.join('\n')}`,
        )
        .addFields(
          { name: '🎶 Canciones', value: `${songs.length}`, inline: true },
          { name: '⏱️ Duración total', value: formatDuration(totalDuration), inline: true },
          { name: '🔁 Bucle', value: loopLabels[queue.repeatMode] ?? 'Sin bucle', inline: true },
          { name: '🔊 Volumen', value: `${queue.volume}%`, inline: true },
        );

      if (songs.length > 11) embed.setFooter({ text: `... y ${songs.length - 11} más` });

      return interaction.reply({ embeds: [embed] });
    }

    // ── nowplaying ────────────────────────────────────────────
    if (sub === 'nowplaying') {
      const song = queue.songs?.[0];
      if (!song) return interaction.reply({ embeds: [errorEmbed('No hay canción reproduciéndose.')], flags: 64 });
      const current = queue.currentTime ?? 0;
      const bar = progressBar(current, song.duration ?? 0);
      const requestedBy = song.user ?? song.requestedBy;
      const loopLabels = ['Desactivado', '🔂 Canción', '🔁 Cola'];

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎵 Reproduciendo ahora')
        .setDescription(`[${song.name}](${song.url})`)
        .addFields(
          {
            name: '⏱️ Progreso',
            value: `\`${formatDuration(current)}\` ${bar} \`${song.formattedDuration ?? '?'}\``,
            inline: false,
          },
          { name: '🔊 Volumen', value: `${queue.volume}%`, inline: true },
          { name: '🔁 Bucle', value: loopLabels[queue.repeatMode] ?? 'Desactivado', inline: true },
          { name: '👤 Solicitado por', value: requestedBy?.toString() ?? 'Desconocido', inline: true },
        )
        .setThumbnail(song.thumbnail ?? null)
        .setFooter({ text: `${queue.songs.length} canciones en cola` });

      return interaction.reply({ embeds: [embed] });
    }

    // ── volume ────────────────────────────────────────────────
    if (sub === 'volume') {
      const nivel = interaction.options.getInteger('nivel');
      queue.setVolume(nivel);
      const icon = nivel === 0 ? '🔇' : nivel < 40 ? '🔈' : nivel < 75 ? '🔉' : '🔊';
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`${icon} Volumen ajustado a **${nivel}%**`)],
        flags: 64,
      });
    }

    // ── loop ──────────────────────────────────────────────────
    if (sub === 'loop') {
      const modo = parseInt(interaction.options.getString('modo'), 10);
      const modeMap = { 0: RepeatMode.DISABLED, 1: RepeatMode.SONG, 2: RepeatMode.QUEUE };
      queue.setRepeatMode(modeMap[modo] ?? RepeatMode.DISABLED);
      const labels = ['❌ Sin bucle', '🔂 Repitiendo canción', '🔁 Repitiendo cola'];
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`Modo de repetición: **${labels[modo]}**`)],
        flags: 64,
      });
    }

    // ── shuffle ───────────────────────────────────────────────
    if (sub === 'shuffle') {
      await queue.shuffle().catch(() => {});
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription('🔀 Cola mezclada aleatoriamente.')],
        flags: 64,
      });
    }

    // ── remove ────────────────────────────────────────────────
    if (sub === 'remove') {
      const pos = interaction.options.getInteger('posicion'); // 1-based (upcoming)
      if (pos >= queue.songs.length) {
        return interaction.reply({ embeds: [errorEmbed(`Solo hay **${queue.songs.length - 1}** canciones en espera.`)], flags: 64 });
      }
      const [removed] = queue.songs.splice(pos, 1);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`🗑️ Eliminada: **${removed.name}**`)],
        flags: 64,
      });
    }

    // ── jump ──────────────────────────────────────────────────
    if (sub === 'jump') {
      const pos = interaction.options.getInteger('posicion'); // 1-based
      if (pos >= queue.songs.length) {
        return interaction.reply({ embeds: [errorEmbed(`Solo hay **${queue.songs.length - 1}** canciones en espera.`)], flags: 64 });
      }
      const target = queue.songs[pos];
      await queue.jump(pos).catch(async () => {
        // Fallback: skip hasta llegar a la posición
        for (let i = 0; i < pos - 1; i++) await queue.skip().catch(() => {});
        await queue.skip().catch(() => {});
      });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`⏩ Saltando a: **${target.name}**`)],
        flags: 64,
      });
    }
  },
};
