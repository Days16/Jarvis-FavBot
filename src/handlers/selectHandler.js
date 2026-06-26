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

// ── Main dispatcher ─────────────────────────────────────────
export async function handleSelect(interaction) {
  const id = interaction.customId;
  const parts = id.split(':');

  try {
    if (parts[0] === 'rps') return await handleRolePanelSelect(interaction, parts);
    if (parts[0] === 'ticket_cat') return await handleTicketCategorySelect(interaction, parts);
    if (id === 'levelreward:remove') return await handleLevelRewardRemove(interaction);
  } catch (e) {
    logger.error(`Error en select ${id}:`, e);
    const payload = { embeds: [errorEmbed('Error procesando la selección.')], flags: 64 };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}
