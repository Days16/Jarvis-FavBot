import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed, successEmbed } from '../utils/embedBuilder.js';

// ── Role panel select menu ──────────────────────────────────
async function handleRolePanelSelect(interaction, parts) {
  // customId: rps:<panelId>
  const panelId = parseInt(parts[1], 10);
  const { getRolePanelById } = await import('../models/RolePanel.js');
  const panel = await getRolePanelById(panelId);
  if (!panel) return interaction.reply({ embeds: [errorEmbed('Panel no encontrado.')], flags: 64 });

  if (panel.requireRole && !interaction.member.roles.cache.has(panel.requireRole)) {
    return interaction.reply({ embeds: [errorEmbed(`Necesitas el rol <@&${panel.requireRole}> para usar este panel.`)], flags: 64 });
  }

  const selectedIds = interaction.values;
  const panelRoleIds = panel.entries.map(e => e.role_id);
  const memberRoles = interaction.member.roles.cache;

  const toAdd = selectedIds.filter(id => !memberRoles.has(id));
  const toRemove = panel.mode === 'exclusive'
    ? panelRoleIds.filter(id => !selectedIds.includes(id) && memberRoles.has(id))
    : [];

  if (toRemove.length) await interaction.member.roles.remove(toRemove).catch(() => {});
  if (toAdd.length) await interaction.member.roles.add(toAdd).catch(() => {});

  const addedNames = toAdd.map(id => `<@&${id}>`).join(', ') || 'ninguno';
  const removedNames = toRemove.map(id => `<@&${id}>`).join(', ') || 'ninguno';

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`✅ Roles actualizados.\n**Añadidos:** ${addedNames}\n**Quitados:** ${removedNames}`)],
    flags: 64,
  });
}

// ── Ticket category select ──────────────────────────────────
async function handleTicketCategorySelect(interaction, parts) {
  // customId: ticket_cat:<nothing>
  const category = interaction.values[0];
  const { getTicketConfig } = await import('../models/GuildTicketConfig.js');
  const config = await getTicketConfig(interaction.guild.id);
  const catDef = config?.categories?.find(c => c.id === category);

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal:${category}`)
    .setTitle(`Ticket — ${catDef?.label ?? category}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Describe tu problema o consulta')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
}

// ── Level reward remove select ──────────────────────────────
async function handleLevelRewardRemove(interaction) {
  const nivel = parseInt(interaction.values[0], 10);
  const { ensureLevelConfig, updateLevelConfig } = await import('../models/GuildLevelConfig.js');
  const cfg = await ensureLevelConfig(interaction.guild.id);
  const rewards = (cfg.roleRewards ?? []).filter(r => r.level !== nivel);
  await updateLevelConfig(interaction.guild.id, { roleRewards: rewards });
  return interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Recompensa del **nivel ${nivel}** eliminada.`)],
    components: [],
  });
}

// ── Music search pick ───────────────────────────────────────
async function handleMusicPick(interaction, parts) {
  // customId: music_pick:<guildId>:<userId>
  const userId = parts[2];
  if (interaction.user.id !== userId)
    return interaction.reply({ embeds: [errorEmbed('Esta selección no es tuya.')], flags: 64 });

  const {
    pendingMusicSearches, getOrCreatePlayer, ensureQueue, formatDuration, isLavalinkReady,
  } = await import('../utils/musicManager.js');

  if (!isLavalinkReady())
    return interaction.update({ embeds: [errorEmbed('Sistema de música no disponible.')], components: [] });

  const key = `${interaction.guild.id}:${userId}`;
  const pending = pendingMusicSearches.get(key);
  if (!pending)
    return interaction.update({ embeds: [errorEmbed('La búsqueda expiró. Vuelve a usar `/music play`.')], components: [] });

  pendingMusicSearches.delete(key);

  const idx = parseInt(interaction.values[0], 10);
  const track = pending.tracks[idx];
  if (!track)
    return interaction.update({ embeds: [errorEmbed('Opción inválida.')], components: [] });

  let player;
  try { player = await getOrCreatePlayer(interaction.guild, pending.vcId); }
  catch (err) { return interaction.update({ embeds: [errorEmbed(err.message)], components: [] }); }

  const queue    = ensureQueue(interaction.guild.id, interaction.channel, pending.vcId);
  const wasEmpty = queue.songs.length === 0;

  const altTracks = pending.tracks.filter((_, i) => i !== idx);
  queue.songs.push({ track, requestedBy: pending.requestedBy, _altTracks: altTracks, _altIdx: 0 });

  if (wasEmpty) {
    await interaction.update({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setDescription(`▶️ Reproduciendo **[${track.info.title}](${track.info.uri ?? '#'})**`)
        .setThumbnail(track.info.artworkUrl ?? null)],
      components: [],
    });
    await player.playTrack({ track: { encoded: track.encoded } });
    player.setGlobalVolume(queue.volume);
  } else {
    await interaction.update({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ **[${track.info.title}](${track.info.uri ?? '#'})** — posición **${queue.songs.length}**.`)
        .setThumbnail(track.info.artworkUrl ?? null)],
      components: [],
    });
  }
}

// ── Main dispatcher ─────────────────────────────────────────
export async function handleSelect(interaction) {
  const id = interaction.customId;
  const parts = id.split(':');

  try {
    if (parts[0] === 'rps') return await handleRolePanelSelect(interaction, parts);
    if (parts[0] === 'ticket_cat') return await handleTicketCategorySelect(interaction, parts);
    if (id === 'levelreward:remove') return await handleLevelRewardRemove(interaction);
    if (parts[0] === 'music_pick') return await handleMusicPick(interaction, parts);
  } catch (e) {
    logger.error(`Error en select ${id}:`, e);
    const payload = { embeds: [errorEmbed('Error procesando la selección.')], flags: 64 };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}
