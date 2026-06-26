/**
 * Comprueba si el ejecutor puede aplicar una acción de moderación sobre el target.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('discord.js').GuildMember} target
 * @param {{ requireBotAbove?: boolean }} opts
 *   requireBotAbove: true → la acción requiere que el BOT tenga rol superior (ban, kick, timeout).
 *                    false → solo es una acción en base de datos (warn, delwarn).
 */
export function isModeratable(interaction, target, { requireBotAbove = true } = {}) {
  if (!target) return false;
  // Nunca moderar al propio bot
  if (target.id === interaction.client.user.id) return false;
  // Nunca moderar al dueño del servidor
  if (target.id === interaction.guild.ownerId) return false;

  // El dueño del servidor puede moderar a cualquiera
  const executorIsOwner = interaction.user.id === interaction.guild.ownerId;

  if (!executorIsOwner) {
    // El moderador debe tener rol superior al target
    if (interaction.member.roles.highest.comparePositionTo(target.roles.highest) <= 0) return false;
  }

  // Para acciones físicas (ban/kick/timeout) el bot también necesita rol superior
  if (requireBotAbove && !target.manageable) return false;

  return true;
}

export function isModerator(member) {
  return (
    member.permissions.has('Administrator') ||
    member.permissions.has('ManageGuild') ||
    member.permissions.has('ModerateMembers')
  );
}
