import { checkCooldown } from '../utils/cooldowns.js';
import { errorEmbed } from '../utils/embedBuilder.js';
import { logger } from '../utils/logger.js';
import { handleButton } from '../handlers/buttonHandler.js';
import { handleSelect } from '../handlers/selectHandler.js';
import { handleModal } from '../handlers/modalHandler.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ── Botones ────────────────────────────────────────────
    if (interaction.isButton()) return handleButton(interaction);

    // ── Select menus ───────────────────────────────────────
    if (interaction.isStringSelectMenu()) return handleSelect(interaction);

    // ── Modals ─────────────────────────────────────────────
    if (interaction.isModalSubmit()) return handleModal(interaction);

    // ── Slash commands ─────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const remaining = checkCooldown(client, interaction, command);
    if (remaining) {
      return interaction.reply({
        embeds: [errorEmbed(`Espera **${remaining}s** antes de volver a usar \`/${interaction.commandName}\`.`)],
        flags: 64,
      });
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      logger.error(`Error en /${interaction.commandName}:`, error);
      const payload = { embeds: [errorEmbed('Ocurrió un error inesperado.')], flags: 64 };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
