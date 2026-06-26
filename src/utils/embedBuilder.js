import { EmbedBuilder } from 'discord.js';

export const COLORS = {
  primary: 0x5865F2,
  success: 0x57F287,
  warning: 0xFEE75C,
  error:   0xED4245,
  mod:     0xFF8C00,
  info:    0x5865F2,
};

export const successEmbed = (title, description) =>
  new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${title}`).setDescription(description).setTimestamp();

export const errorEmbed = (description) =>
  new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Error').setDescription(description).setTimestamp();

export const warnEmbed = (title, description) =>
  new EmbedBuilder().setColor(COLORS.warning).setTitle(`⚠️ ${title}`).setDescription(description).setTimestamp();

export const infoEmbed = (title, description) =>
  new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description).setTimestamp();

export function modEmbed(action, color, fields) {
  const embed = new EmbedBuilder()
    .setColor(color ?? COLORS.mod)
    .setTitle(action)
    .setTimestamp()
    .setFooter({ text: `ID: MOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}` });
  for (const [name, value, inline = false] of fields) {
    embed.addFields({ name, value: String(value || 'N/A'), inline });
  }
  return embed;
}
