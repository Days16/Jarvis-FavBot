import { Collection } from 'discord.js';

export function checkCooldown(client, interaction, command) {
  if (!command.cooldown) return null;

  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(command.data.name);
  const cooldownMs = command.cooldown * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expiry = timestamps.get(interaction.user.id) + cooldownMs;
    if (now < expiry) {
      return ((expiry - now) / 1000).toFixed(1);
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);
  return null;
}
