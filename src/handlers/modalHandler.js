import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embedBuilder.js';

// ── Ticket modal ────────────────────────────────────────────
async function handleTicketModal(interaction, parts) {
  // customId: ticket_modal:<category>
  const category = parts[1];
  const reason = interaction.fields.getTextInputValue('reason');

  await interaction.deferReply({ flags: 64 });

  const { getTicketConfig } = await import('../models/GuildTicketConfig.js');
  const { openTicket } = await import('../utils/ticketManager.js');

  const config = await getTicketConfig(interaction.guild.id);
  if (!config) {
    return interaction.editReply({ embeds: [errorEmbed('El sistema de tickets no está configurado.')] });
  }

  const channel = await openTicket(interaction.guild, interaction.user, category, reason, config);
  await interaction.editReply({ embeds: [{ color: 0x57f287, description: `✅ Tu ticket fue creado: ${channel}` }] });
}

// ── Main dispatcher ─────────────────────────────────────────
export async function handleModal(interaction) {
  const id = interaction.customId;
  const parts = id.split(':');

  try {
    if (parts[0] === 'ticket_modal') return await handleTicketModal(interaction, parts);
  } catch (e) {
    logger.error(`Error en modal ${id}:`, e);
    const payload = { embeds: [errorEmbed('Error procesando el formulario.')], flags: 64 };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}
